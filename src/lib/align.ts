/**
 * Where does the saved image sit inside the original?
 *
 * The player can crop, resize and rotate before saving, so the image that comes
 * back is not the image we handed out. Diffing without solving that first makes
 * every zone look changed — which would make the whole game fire flags at random.
 *
 * The search is 1-D and exhaustive, not fuzzy matching: a crop is axis aligned,
 * so the column means of the saved image are a slice of the column means of the
 * original, possibly stretched. Find the slice on each axis, then verify in 2-D.
 */

import { type Gray, ncc, profiles, rotateGray, sample } from './gray';

export type AxisFit = {
  /** saved pixels per original pixel */
  k: number;
  /** original coordinate that the saved image starts at */
  off: number;
  score: number;
};

export type Alignment = {
  rotation: 0 | 90 | 180 | 270;
  x: AxisFit;
  y: AxisFit;
  /** 2-D normalised correlation over the overlap, -1..1 */
  score: number;
  /** how much of the original survives in the saved image, 0..1 */
  coverage: number;
  /** the saved plate, turned back upright */
  plate: Gray;
};

const ROTATIONS = [0, 90, 180, 270] as const;

/**
 * How much better than "untouched" a shifted fit has to score before it wins.
 *
 * When the saved image is the same size as the one we handed out, the frame was
 * almost certainly not moved, and a big honest edit — a shape covering a window —
 * pulls the correlation down on its own. Without a margin the search answers that
 * by sliding the whole image sideways, which scores a hair higher and makes every
 * other zone read as slightly changed. The frame staying put is the explanation to
 * beat, not just another candidate.
 *
 * The marina is what set the size of this. It is full of repeating verticals —
 * dock pilings, palm trunks, window mullions — and a shifted fit can alias onto
 * them and win by about 0.03. A real crop-and-resize is nothing like that close:
 * Level 2's is a 1.59x stretch. So the margin sits above the aliasing and far
 * below anything genuine.
 */
const IDENTITY_MARGIN = 0.06;

function lerp(series: ArrayLike<number>, at: number): number {
  const i0 = Math.floor(at);
  const i1 = Math.min(i0 + 1, series.length - 1);
  const f = at - i0;
  return series[Math.max(0, i0)] * (1 - f) + series[i1] * f;
}

function scoreAxis(
  orig: ArrayLike<number>,
  saved: ArrayLike<number>,
  k: number,
  off: number,
  maxSamples: number,
): number {
  const n = orig.length;
  const m = saved.length;
  const step = Math.max(1, Math.floor(m / maxSamples));
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < m; i += step) {
    const o = off + i / k;
    if (o < -1.5 || o > n + 0.5) return -2;
    a.push(saved[i]);
    b.push(lerp(orig, Math.min(n - 1, Math.max(0, o))));
  }
  if (a.length < 8) return -2;
  return ncc(a, b);
}

function matchAxis(orig: ArrayLike<number>, saved: ArrayLike<number>): AxisFit {
  const n = orig.length;
  const m = saved.length;
  let best: AxisFit = { k: 1, off: 0, score: -2 };

  const consider = (k: number, off: number, samples: number) => {
    const span = m / k;
    if (span < n * 0.25 || span > n * 1.25) return;
    const s = scoreAxis(orig, saved, k, off, samples);
    if (s > best.score) best = { k, off, score: s };
  };

  // coarse: every plausible scale, offsets every 3 original pixels
  for (let k = 0.5; k <= 2.001; k += 0.05) {
    const span = m / k;
    const lo = -0.08 * n;
    const hi = n - span + 0.08 * n;
    if (hi < lo) continue;
    for (let off = lo; off <= hi; off += 3) consider(k, off, 100);
  }

  // refine around the winner
  const k0 = best.k;
  const off0 = best.off;
  for (let k = k0 - 0.06; k <= k0 + 0.0601; k += 0.005) {
    for (let off = off0 - 4; off <= off0 + 4; off += 0.5) consider(k, off, 220);
  }
  return best;
}

/**
 * Sample the overlap on a grid and correlate. This is the honest check.
 *
 * It ignores the outer border, because that is exactly where a frame, a vignette
 * or a caption bar lands. Judging alignment on pixels the player was invited to
 * paint over makes a correctly aligned photo look unrecognisable.
 */
const BORDER = 0.07;

function verify2d(
  orig: Gray,
  plate: Gray,
  x: AxisFit,
  y: AxisFit,
  steps = 44,
): { score: number; coverage: number } {
  const a: number[] = [];
  const b: number[] = [];
  let seen = 0;
  let total = 0;
  for (let gy = 0; gy < steps; gy++) {
    for (let gx = 0; gx < steps; gx++) {
      const ox = (BORDER + ((gx + 0.5) / steps) * (1 - 2 * BORDER)) * orig.w;
      const oy = (BORDER + ((gy + 0.5) / steps) * (1 - 2 * BORDER)) * orig.h;
      total++;
      const sx = (ox - x.off) * x.k;
      const sy = (oy - y.off) * y.k;
      const sv = sample(plate, sx, sy);
      if (sv === null) continue;
      const ov = sample(orig, ox, oy);
      if (ov === null) continue;
      seen++;
      a.push(ov);
      b.push(sv);
    }
  }
  const coverage = total === 0 ? 0 : seen / total;
  if (coverage < 0.15) return { score: -2, coverage };
  return { score: ncc(a, b), coverage };
}

function spread(v: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < v.length; i++) m += v[i];
  m /= Math.max(1, v.length);
  let acc = 0;
  for (let i = 0; i < v.length; i++) acc += (v[i] - m) * (v[i] - m);
  return Math.sqrt(acc / Math.max(1, v.length));
}

/**
 * Candidate fits for one axis, cheapest explanation first.
 *
 * A flat scene — a car park, a bare interview room — has almost no variation
 * along one axis, and matching profiles that carry no information invents
 * answers. So the obvious explanations are always on the list, and the 2-D check
 * below decides between them.
 */
function axisCandidates(
  orig: ArrayLike<number>,
  plate: ArrayLike<number>,
): AxisFit[] {
  const out: AxisFit[] = [
    { k: 1, off: 0, score: 0 }, // untouched
    { k: plate.length / orig.length, off: 0, score: 0 }, // resized to fit
  ];
  if (spread(orig) > 0.004 && spread(plate) > 0.004) out.push(matchAxis(orig, plate));
  const seen = new Set<string>();
  return out.filter((c) => {
    const key = `${c.k.toFixed(3)}:${c.off.toFixed(1)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Find the transform from original coordinates to saved coordinates.
 * `sx = (ox - x.off) * x.k`, same on y, after the plate is turned upright.
 */
export function align(orig: Gray, saved: Gray): Alignment {
  const origProfiles = profiles(orig);

  // Fast path: nothing was moved. Keeps brightness-only edits exact.
  if (Math.abs(saved.w - orig.w) <= 1 && Math.abs(saved.h - orig.h) <= 1) {
    const identity = { k: 1, off: 0, score: 1 };
    const check = verify2d(orig, saved, identity, identity);
    if (check.score >= 0.99) {
      return {
        rotation: 0,
        x: identity,
        y: identity,
        score: check.score,
        coverage: check.coverage,
        plate: saved,
      };
    }
  }

  const sameSize =
    Math.abs(saved.w - orig.w) <= 1 && Math.abs(saved.h - orig.h) <= 1;

  let best: Alignment | null = null;
  let bestScore = -Infinity;
  for (const rotation of ROTATIONS) {
    const plate = rotateGray(saved, rotation);
    // a rotation that leaves a wildly different aspect ratio is not worth searching
    const ratio = plate.w / plate.h / (orig.w / orig.h);
    if (ratio < 0.3 || ratio > 3.4) continue;
    const p = profiles(plate);
    const xs = axisCandidates(origProfiles.cols, p.cols);
    const ys = axisCandidates(origProfiles.rows, p.rows);
    for (const x of xs) {
      for (const y of ys) {
        const { score, coverage } = verify2d(orig, plate, x, y);
        const untouched =
          sameSize && rotation === 0 && x.k === 1 && x.off === 0 && y.k === 1 && y.off === 0;
        const ranked = untouched ? score + IDENTITY_MARGIN : score;
        if (ranked > bestScore) {
          bestScore = ranked;
          best = { rotation, x, y, score, coverage, plate };
        }
      }
    }
  }

  if (!best) {
    const identity = { k: 1, off: 0, score: 0 };
    return {
      rotation: 0,
      x: identity,
      y: identity,
      score: -2,
      coverage: 0,
      plate: saved,
    };
  }
  return best;
}
