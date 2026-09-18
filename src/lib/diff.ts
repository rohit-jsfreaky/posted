/**
 * Read the saved image and measure what changed.
 *
 * Nothing here knows about levels or flags. It answers one question per zone —
 * "what happened here?" — and hands the numbers to the level to interpret.
 *
 * Nothing here looks at *how* the edit was made either. A zone counts as gone
 * whether it was cropped off, painted over, covered with a sticker or blurred to
 * mush (DESIGN.md sec 5). The method is inferred later, from the shape of the
 * numbers, and that is what suspicion is built on.
 *
 * The whole-photo fit matters more than it looks. The editor's brightness slider
 * *subtracts* light, it does not scale it, so a dark object loses a far bigger
 * share of its brightness than a bright one. Treating that as a single multiplier
 * makes every dark zone look tampered with. Fitting `saved = a * original + b`
 * covers brightness, contrast and both together, and then a zone is only
 * suspicious when it drifts from what that fit predicts.
 */

import { align, type Alignment } from './align';
import {
  WORK_W,
  type Gray,
  grayFromImage,
  highFrequency,
  loadImage,
  ncc,
  platesFromImage,
  rotateGray,
  sample,
} from './gray';
import type { Zone, ZoneMap } from './zones';

/** A zone is gone once this much of its structure stops matching. */
export const STRUCTURE_THRESHOLD = 0.1;
/** ...or once its brightness drifts this far from the whole-photo fit, in luma. */
export const RESIDUAL_THRESHOLD = 0.07;
/** A zone that keeps less than this share of its detail stopped being legible. */
export const DETAIL_THRESHOLD = 0.5;
/** Below this 2-D correlation we do not trust the alignment at all. */
export const TRUST_THRESHOLD = 0.35;
/** A photo crushed past this has nothing left to read, so it proves nothing. */
export const READABLE_GAIN = 0.12;
export const READABLE_CONTRAST = 0.02;
/** Below this spread, a patch is flat and correlation on it means nothing. */
const FLAT = 0.012;
/** Grain is measured on a bigger plate, since downscaling averages it away. */
const FINE_W = 900;

export type Reading = {
  /** share of the zone that fell outside the saved frame, 0..1 */
  missing: number;
  /** 0 = identical structure, 1 = nothing in common */
  structure: number;
  /** how far the zone's brightness sits from the whole-photo fit, in luma */
  residual: number;
  /** signed version of the same thing: positive means brighter than predicted */
  drift: number;
  /** detail left vs detail expected. Blur and pixelate crush this toward 0 */
  detail: number;
  /** how much more colourful the zone became. Stickers push this up */
  colour: number;
  /** grain in the zone vs grain in the whole photo. A flat paste sits near 0 */
  grain: number;
  /** absolute brightness the zone ended up at, 0..1. Near 1 means blown out */
  bright: number;
  changed: boolean;
};

export type DiffReport = {
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
  photometry: { a: number; b: number; contrast: number };
  dims: {
    orig: [number, number];
    saved: [number, number];
    changed: boolean;
    aspectChanged: boolean;
  };
  zones: Record<string, Reading>;
  /** the outer 4% border, for spotting a frame */
  ring: Reading;
};

/** The value this share of the way up a sorted list. */
function lowPercentile(v: number[], share: number): number {
  if (v.length === 0) return 0;
  const sorted = [...v].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * share));
  return sorted[i];
}

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

type Before = { luma: Gray; sat: Gray };
type After = { luma: Gray; sat: Gray; hf: Gray };

function mapPoint(al: Alignment, ox: number, oy: number) {
  return { x: (ox - al.x.off) * al.x.k, y: (oy - al.y.off) * al.y.k };
}

/** Sample everything the two images share, on a grid. */
function commonSamples(orig: Gray, plate: Gray, al: Alignment, steps = 56) {
  const before: number[] = [];
  const after: number[] = [];
  for (let gy = 0; gy < steps; gy++) {
    for (let gx = 0; gx < steps; gx++) {
      const ox = ((gx + 0.5) / steps) * orig.w;
      const oy = ((gy + 0.5) / steps) * orig.h;
      const ov = sample(orig, ox, oy);
      if (ov === null) continue;
      const p = mapPoint(al, ox, oy);
      const sv = sample(plate, p.x, p.y);
      if (sv === null) continue;
      before.push(ov);
      after.push(sv);
    }
  }
  return { before, after };
}

/**
 * Fit saved = a * original + b over the shared content.
 *
 * Trimmed, not plain least squares. A big local edit — a black bar over a face,
 * a car pasted into a bay — drags a plain fit toward itself, and then every
 * untouched zone looks like it drifted. Fitting once, throwing away the worst
 * quarter of the residuals and fitting again makes the line describe the part of
 * the photo the player did *not* touch, which is the part we want to measure
 * everything else against.
 */
function fitLine(before: number[], after: number[]) {
  const sb = stats(before);
  const sa = stats(after);
  let cov = 0;
  for (let i = 0; i < before.length; i++) {
    cov += (before[i] - sb.mean) * (after[i] - sa.mean);
  }
  cov /= Math.max(1, before.length);
  const varB = sb.std * sb.std;
  const a = varB > 1e-6 ? cov / varB : 1;
  return { a, b: sa.mean - a * sb.mean };
}

function photometry(before: number[], after: number[]) {
  let { a, b } = fitLine(before, after);

  if (before.length > 40) {
    const errs = before
      .map((v, i) => ({ i, e: Math.abs(after[i] - (a * v + b)) }))
      .sort((p, q) => p.e - q.e);
    const keep = errs.slice(0, Math.floor(errs.length * 0.75)).map((x) => x.i);
    const kb = keep.map((i) => before[i]);
    const ka = keep.map((i) => after[i]);
    const refit = fitLine(kb, ka);
    a = refit.a;
    b = refit.b;
  }

  const sb = stats(before);
  const sa = stats(after);
  const gain = sb.mean > 1e-4 ? sa.mean / sb.mean : 1;
  return { a, b, gain, contrast: sa.std };
}

type Fit = { a: number; b: number };

function readZone(
  orig: Before,
  saved: After,
  al: Alignment,
  zone: Zone,
  fit: Fit,
  grainScale: number,
  steps = 26,
): Reading {
  const rx = zone.x * orig.luma.w;
  const ry = zone.y * orig.luma.h;
  const rw = zone.w * orig.luma.w;
  const rh = zone.h * orig.luma.h;

  const before: number[] = [];
  const after: number[] = [];
  const satBefore: number[] = [];
  const satAfter: number[] = [];
  const hfAfter: number[] = [];
  let outside = 0;
  let total = 0;

  for (let gy = 0; gy < steps; gy++) {
    for (let gx = 0; gx < steps; gx++) {
      const ox = rx + ((gx + 0.5) / steps) * rw;
      const oy = ry + ((gy + 0.5) / steps) * rh;
      const ov = sample(orig.luma, ox, oy);
      if (ov === null) continue;
      total++;
      const p = mapPoint(al, ox, oy);
      const sv = sample(saved.luma, p.x, p.y);
      if (sv === null) {
        outside++;
        continue;
      }
      before.push(ov);
      after.push(sv);
      const sb = sample(orig.sat, ox, oy);
      const sa = sample(saved.sat, p.x, p.y);
      if (sb !== null && sa !== null) {
        satBefore.push(sb);
        satAfter.push(sa);
      }
      // grain lives on the finer plate, so scale the coordinates up to it
      const hv = sample(saved.hf, p.x * grainScale, p.y * grainScale);
      if (hv !== null) hfAfter.push(hv);
    }
  }

  const missing = total === 0 ? 1 : outside / total;
  if (before.length < 16) {
    return {
      missing,
      structure: 1,
      residual: 1,
      drift: -1,
      detail: 0,
      colour: 0,
      grain: 0,
      bright: 0,
      changed: true,
    };
  }

  const sb = stats(before);
  const sa = stats(after);

  const predicted = fit.a * sb.mean + fit.b;
  const drift = sa.mean - predicted;
  const residual = Math.abs(drift);

  // the whole-photo fit also scales contrast, so expected detail is a * original
  const expectedDetail = Math.abs(fit.a) * sb.std;
  const detail = expectedDetail > 1e-4 ? sa.std / expectedDetail : 1;

  const colour =
    satAfter.length > 0
      ? stats(satAfter).mean - stats(satBefore).mean
      : 0;

  // Grain is the *floor* of the high frequency energy, not its average. An
  // object's own edges are high frequency too, so a detailed sticker would read
  // as grainy if we averaged. A low percentile ignores the edges and measures
  // the noise sitting between them, which is what film grain actually is.
  const grain = lowPercentile(hfAfter, 0.3);

  let structure: number;
  if (sb.std < FLAT) {
    // The zone never had detail of its own. If it has some now, something was
    // put there — an empty parking bay that suddenly has edges in it is the
    // whole of Level 4. This is the mirror of the rule below.
    structure = sa.std > FLAT * 2.5 ? 1 : 0;
  } else if (sa.std < FLAT) {
    // it had detail and now has none: painted over, blurred out, or covered
    structure = 1;
  } else {
    structure = (1 - ncc(before, after)) / 2;
  }

  // A zone pinned at pure white or pure black is clipped, and clipping is what
  // light does on its own. Its brightness cannot match any prediction, so the
  // residual means nothing here — but the detail test below still catches that
  // nobody can see anything in it any more.
  const clipped = sa.mean > 0.95 || sa.mean < 0.03;

  const changed =
    missing > 0.5 ||
    structure > STRUCTURE_THRESHOLD ||
    (!clipped && residual > RESIDUAL_THRESHOLD) ||
    // blur, pixelate and a blown highlight barely move the average or the
    // correlation, they just take the detail out. A zone nobody can read is gone.
    (sb.std > FLAT && detail < DETAIL_THRESHOLD);

  return {
    missing,
    structure,
    residual,
    drift,
    detail,
    colour,
    grain,
    bright: sa.mean,
    changed,
  };
}

/** The outer border of the photo, as four strips. A frame lands right here. */
const RING_THICKNESS = 0.04;

function readRing(
  orig: Before,
  saved: After,
  al: Alignment,
  fit: Fit,
  grainScale: number,
): Reading {
  const strips: Zone[] = [
    { x: 0, y: 0, w: 1, h: RING_THICKNESS },
    { x: 0, y: 1 - RING_THICKNESS, w: 1, h: RING_THICKNESS },
    { x: 0, y: RING_THICKNESS, w: RING_THICKNESS, h: 1 - 2 * RING_THICKNESS },
    {
      x: 1 - RING_THICKNESS,
      y: RING_THICKNESS,
      w: RING_THICKNESS,
      h: 1 - 2 * RING_THICKNESS,
    },
  ];
  const parts = strips.map((s) =>
    readZone(orig, saved, al, s, fit, grainScale, 18),
  );
  const mean = (pick: (r: Reading) => number) =>
    parts.reduce((s, p) => s + pick(p), 0) / parts.length;
  const changedShare = parts.filter((p) => p.changed).length / parts.length;
  return {
    missing: mean((p) => p.missing),
    structure: mean((p) => p.structure),
    residual: mean((p) => p.residual),
    drift: mean((p) => p.drift),
    detail: mean((p) => p.detail),
    colour: mean((p) => p.colour),
    grain: mean((p) => p.grain),
    bright: mean((p) => p.bright),
    // a frame is a border that changed all the way round, not on one side
    changed: changedShare >= 0.75,
  };
}

/**
 * Compare what we posted with what came back.
 * Both arguments are data URLs; the saved one is whatever the editor handed us.
 */
export async function diffImages(
  originalUrl: string,
  savedUrl: string,
  zones: ZoneMap,
): Promise<DiffReport> {
  const [origImg, savedImg] = await Promise.all([
    loadImage(originalUrl),
    loadImage(savedUrl),
  ]);

  const density = WORK_W / origImg.naturalWidth;
  const origPlates = platesFromImage(
    origImg,
    WORK_W,
    Math.round(origImg.naturalHeight * density),
  );
  const savedW = Math.round(savedImg.naturalWidth * density);
  const savedH = Math.round(savedImg.naturalHeight * density);
  const savedPlates = platesFromImage(savedImg, savedW, savedH);

  const al = align(origPlates.luma, savedPlates.luma);

  // grain needs a finer look than the working plate can give
  const fineScale = FINE_W / Math.max(1, savedImg.naturalWidth);
  const fineSaved = grayFromImage(
    savedImg,
    FINE_W,
    Math.max(1, Math.round(savedImg.naturalHeight * fineScale)),
  );
  const hfPlate = highFrequency(fineSaved);
  // the saved plate may have been turned upright during alignment; match that
  const hfUpright = rotateGray(hfPlate, al.rotation);
  const grainScale = hfUpright.w / Math.max(1, al.plate.w);

  const orig: Before = { luma: origPlates.luma, sat: origPlates.sat };
  const saved: After = {
    luma: al.plate,
    sat: rotateGray(savedPlates.sat, al.rotation),
    hf: hfUpright,
  };

  const { before, after } = commonSamples(orig.luma, saved.luma, al);
  const fit = photometry(before, after);

  const aligned = al.score >= TRUST_THRESHOLD;
  const unreadable = fit.gain < READABLE_GAIN || fit.contrast < READABLE_CONTRAST;
  const trusted = aligned && !unreadable;

  const blank: Reading = {
    missing: 0,
    structure: 0,
    residual: 0,
    drift: 0,
    detail: 1,
    colour: 0,
    grain: 0,
    bright: 0,
    changed: false,
  };

  const readings: Record<string, Reading> = {};
  for (const [name, zone] of Object.entries(zones)) {
    readings[name] = trusted
      ? readZone(orig, saved, al, zone, fit, grainScale)
      : blank;
  }

  const ow = origImg.naturalWidth;
  const oh = origImg.naturalHeight;
  const sw = savedImg.naturalWidth;
  const sh = savedImg.naturalHeight;

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
      orig: [ow, oh],
      saved: [sw, sh],
      changed: ow !== sw || oh !== sh,
      aspectChanged: Math.abs(ow / oh - sw / sh) > 0.02,
    },
    zones: readings,
    ring: trusted ? readRing(orig, saved, al, fit, grainScale) : blank,
  };
}

/** Average grain across the whole photo, used as the yardstick in Level 4. */
export function sceneGrain(report: DiffReport, zones: string[]): number {
  const vals = zones
    .map((z) => report.zones[z]?.grain)
    .filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
