/**
 * Read the saved image and decide what the player claimed.
 *
 * Nothing here looks at *how* the edit was made. A zone counts as gone whether it
 * was cropped off, painted over, covered with a sticker or blurred to mush — the
 * game reads the result (DESIGN.md sec 5).
 *
 * Three independent questions per post:
 *   1. where does the saved image sit inside the original?   -> align.ts
 *   2. what did the player do to the whole photo?            -> one linear fit
 *   3. what did they do to this zone beyond that?            -> per zone
 *
 * Step 2 matters more than it looks. The editor's brightness slider *subtracts*
 * light, it does not scale it, so a dark object loses a far bigger share of its
 * brightness than a bright one. Treating that as a single multiplier makes every
 * dark zone look tampered with. Fitting `saved = a * original + b` instead covers
 * brightness, contrast and both together, and then a zone is only suspicious when
 * it drifts from what that fit predicts.
 */

import { align, type Alignment } from './align';
import { WORK_W, type Gray, grayFromImage, loadImage, ncc, sample } from './gray';
import { ZONES, type Zone } from './scene';

/** A zone is gone once this much of its structure stops matching. */
export const STRUCTURE_THRESHOLD = 0.1;
/** ...or once its brightness drifts this far from the whole-photo fit, in luma. */
export const RESIDUAL_THRESHOLD = 0.07;
/** The whole photo counts as night below this share of the original brightness. */
export const NIGHT_THRESHOLD = 0.65;
/** Below this 2-D correlation we do not trust the alignment at all. */
export const TRUST_THRESHOLD = 0.35;
/** A photo crushed past this has nothing left to read, so it proves nothing. */
export const READABLE_GAIN = 0.12;
export const READABLE_CONTRAST = 0.02;
/** Below this spread, a patch is flat and correlation on it means nothing. */
const FLAT = 0.012;

export type ZoneReading = {
  /** share of the zone that fell outside the saved frame, 0..1 */
  missing: number;
  /** 0 = identical structure, 1 = nothing in common */
  structure: number;
  /** how far the zone's brightness sits from the whole-photo fit, in luma */
  residual: number;
  gone: boolean;
};

export type DiffReport = {
  /** the alignment held up and the photo still carries information */
  trusted: boolean;
  unreadable: boolean;
  alignment: Pick<Alignment, 'rotation' | 'score' | 'coverage'> & {
    kx: number;
    ky: number;
    offX: number;
    offY: number;
  };
  /** overall brightness of the saved photo vs the original, over shared content */
  gain: number;
  /** the whole-photo fit: saved = a * original + b */
  photometry: { a: number; b: number; contrast: number };
  dims: { orig: [number, number]; saved: [number, number]; changed: boolean };
  zones: Record<string, ZoneReading>;
};

function stats(v: number[]) {
  const n = v.length;
  if (n === 0) return { mean: 0, std: 0 };
  let mean = 0;
  for (let i = 0; i < n; i++) mean += v[i];
  mean /= n;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (v[i] - mean) * (v[i] - mean);
  return { mean, std: Math.sqrt(acc / n) };
}

/** Sample everything the two images share, on a grid. */
function commonSamples(orig: Gray, plate: Gray, a: Alignment, steps = 56) {
  const before: number[] = [];
  const after: number[] = [];
  for (let gy = 0; gy < steps; gy++) {
    for (let gx = 0; gx < steps; gx++) {
      const ox = ((gx + 0.5) / steps) * orig.w;
      const oy = ((gy + 0.5) / steps) * orig.h;
      const ov = sample(orig, ox, oy);
      if (ov === null) continue;
      const sv = sample(plate, (ox - a.x.off) * a.x.k, (oy - a.y.off) * a.y.k);
      if (sv === null) continue;
      before.push(ov);
      after.push(sv);
    }
  }
  return { before, after };
}

/** Least squares fit of saved = a * original + b over the shared content. */
function photometry(before: number[], after: number[]) {
  const sb = stats(before);
  const sa = stats(after);
  let cov = 0;
  for (let i = 0; i < before.length; i++) {
    cov += (before[i] - sb.mean) * (after[i] - sa.mean);
  }
  cov /= Math.max(1, before.length);
  const varB = sb.std * sb.std;
  const a = varB > 1e-6 ? cov / varB : 1;
  const b = sa.mean - a * sb.mean;
  const gain = sb.mean > 1e-4 ? sa.mean / sb.mean : 1;
  return { a, b, gain, contrast: sa.std };
}

function zoneToWork(zone: Zone, g: Gray) {
  return { x: zone.x * g.w, y: zone.y * g.h, w: zone.w * g.w, h: zone.h * g.h };
}

function readZone(
  orig: Gray,
  plate: Gray,
  al: Alignment,
  zone: Zone,
  fit: { a: number; b: number },
  steps = 26,
): ZoneReading {
  const r = zoneToWork(zone, orig);
  const before: number[] = [];
  const after: number[] = [];
  let outside = 0;
  let total = 0;

  for (let gy = 0; gy < steps; gy++) {
    for (let gx = 0; gx < steps; gx++) {
      const ox = r.x + ((gx + 0.5) / steps) * r.w;
      const oy = r.y + ((gy + 0.5) / steps) * r.h;
      const ov = sample(orig, ox, oy);
      if (ov === null) continue;
      total++;
      const sv = sample(plate, (ox - al.x.off) * al.x.k, (oy - al.y.off) * al.y.k);
      if (sv === null) {
        outside++;
        continue;
      }
      before.push(ov);
      after.push(sv);
    }
  }

  const missing = total === 0 ? 1 : outside / total;
  if (before.length < 16) {
    return { missing, structure: 1, residual: 1, gone: true };
  }

  const sb = stats(before);
  const sa = stats(after);

  // What the whole-photo adjustment predicts this zone should now look like.
  const predicted = fit.a * sb.mean + fit.b;
  const residual = Math.abs(sa.mean - predicted);

  let structure: number;
  if (sb.std < FLAT) {
    // the zone never had any detail, so only its brightness can tell us anything
    structure = 0;
  } else if (sa.std < FLAT) {
    // it had detail and now has none: painted over, blurred out, or covered
    structure = 1;
  } else {
    structure = (1 - ncc(before, after)) / 2;
  }

  const gone =
    missing > 0.5 ||
    structure > STRUCTURE_THRESHOLD ||
    residual > RESIDUAL_THRESHOLD;

  return { missing, structure, residual, gone };
}

/**
 * Compare what we posted with what came back.
 * Both arguments are data URLs; the saved one is whatever the editor handed us.
 */
export async function diffImages(
  originalUrl: string,
  savedUrl: string,
  zones: Record<string, Zone> = ZONES,
): Promise<DiffReport> {
  const [origImg, savedImg] = await Promise.all([
    loadImage(originalUrl),
    loadImage(savedUrl),
  ]);

  const density = WORK_W / origImg.naturalWidth;
  const orig = grayFromImage(
    origImg,
    WORK_W,
    Math.round(origImg.naturalHeight * density),
  );
  const saved = grayFromImage(
    savedImg,
    Math.round(savedImg.naturalWidth * density),
    Math.round(savedImg.naturalHeight * density),
  );

  const al = align(orig, saved);
  const { before, after } = commonSamples(orig, al.plate, al);
  const fit = photometry(before, after);

  const aligned = al.score >= TRUST_THRESHOLD;
  const unreadable = fit.gain < READABLE_GAIN || fit.contrast < READABLE_CONTRAST;
  const trusted = aligned && !unreadable;

  const readings: Record<string, ZoneReading> = {};
  for (const [name, zone] of Object.entries(zones)) {
    readings[name] = trusted
      ? readZone(orig, al.plate, al, zone, fit)
      : { missing: 0, structure: 0, residual: 0, gone: false };
  }

  return {
    trusted,
    unreadable,
    alignment: {
      rotation: al.rotation,
      score: al.score,
      coverage: al.coverage,
      kx: al.x.k,
      ky: al.y.k,
      offX: al.x.off,
      offY: al.y.off,
    },
    gain: fit.gain,
    photometry: { a: fit.a, b: fit.b, contrast: fit.contrast },
    dims: {
      orig: [origImg.naturalWidth, origImg.naturalHeight],
      saved: [savedImg.naturalWidth, savedImg.naturalHeight],
      changed:
        origImg.naturalWidth !== savedImg.naturalWidth ||
        origImg.naturalHeight !== savedImg.naturalHeight,
    },
    zones: readings,
  };
}

export type FlagName = 'night' | 'bouncer_removed';

/** Turn measurements into the flags Level 1 cares about. */
export function detectFlags(report: DiffReport): FlagName[] {
  if (!report.trusted) return [];
  const flags: FlagName[] = [];
  if (report.gain < NIGHT_THRESHOLD) flags.push('night');
  if (report.zones.bouncer?.gone) flags.push('bouncer_removed');
  return flags;
}
