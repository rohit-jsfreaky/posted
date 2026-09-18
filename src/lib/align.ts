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

/** Sample the overlap on a grid and correlate. This is the honest check. */
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
      const ox = ((gx + 0.5) / steps) * orig.w;
      const oy = ((gy + 0.5) / steps) * orig.h;
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

  let best: Alignment | null = null;
  for (const rotation of ROTATIONS) {
    const plate = rotateGray(saved, rotation);
    // a rotation that leaves a wildly different aspect ratio is not worth searching
    const ratio = plate.w / plate.h / (orig.w / orig.h);
    if (ratio < 0.3 || ratio > 3.4) continue;
    const p = profiles(plate);
    const x = matchAxis(origProfiles.cols, p.cols);
    const y = matchAxis(origProfiles.rows, p.rows);
    const { score, coverage } = verify2d(orig, plate, x, y);
    if (!best || score > best.score) {
      best = { rotation, x, y, score, coverage, plate };
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
