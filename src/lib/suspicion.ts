/**
 * How much does this post smell?
 *
 * The game never sees which tool was used. It infers the method from the shape of
 * the measurements, which is the whole point: several tools reach the same flag at
 * different costs, and the skill is lying with the fewest, most plausible moves.
 *
 *   crop an edge object      low     nothing left behind, but the frame changes
 *   brightness / hue         low     the whole photo moves together
 *   blow a highlight out     low     highlights clip in real photos constantly
 *   blur a region            medium  plausible depth of field, if nothing else is sharp
 *   sticker over it          medium  belongs in the scene, or it does not
 *   paint over it            high    edges never match
 */

import type { DiffReport, Reading } from './diff';
import type { Level } from './level';

export type Method =
  | 'cropped'
  | 'dimmed'
  | 'blown'
  | 'blurred'
  | 'pasted'
  | 'painted'
  | 'covered';

export type Note = {
  zone: string;
  method: Method;
  cost: number;
  note: string;
};

export type Suspicion = {
  total: number;
  notes: Note[];
};

const COST: Record<Method, number> = {
  cropped: 8,
  dimmed: 4,
  blown: 6,
  blurred: 16,
  pasted: 20,
  painted: 34,
  covered: 22,
};

/**
 * What he says when he can smell something but has not found the tell.
 *
 * These are read out as a sentence, not as labels in a list — "cropped off the
 * edge." on its own is a caption, and he types in sentences.
 */
export const NOTE: Record<Method, string> = {
  cropped: 'something has come off the edge of this one',
  dimmed: 'the light in this is not the light that was there',
  blown: 'that highlight is doing an awful lot of work',
  blurred: 'one part of this is softer than everything the same distance away',
  pasted: 'something in this is sitting on top of the photo rather than in it',
  painted: 'the edges in this do not match anything around them',
  covered: 'a piece of this has been covered over',
};

/** Work out how a zone was most likely changed, from the numbers alone. */
/** The same table, named for the content check so it cannot drift unnoticed. */
export const NOTES_FOR_CHECK = NOTE;

export function methodFor(z: Reading): Method | null {
  if (!z.changed) return null;
  if (z.missing > 0.45) return 'cropped';
  // a window that clipped to white because the whole photo got brighter is not a
  // local edit at all — real photos blow out highlights every day
  if (z.bright > 0.88 && z.detail < 0.5) return 'blown';
  if (z.colour > 0.1) return 'pasted';
  if (z.detail < 0.45 && z.structure < 0.55) return 'blurred';
  if (z.structure > 0.45 && z.residual > 0.1) return 'painted';
  if (z.structure > 0.45) return 'covered';
  return 'dimmed';
}

export function assess(level: Level, report: DiffReport): Suspicion {
  const notes: Note[] = [];
  if (!report.trusted) return { total: 0, notes };

  for (const [name, z] of Object.entries(report.zones)) {
    const method = methodFor(z);
    if (!method) continue;
    notes.push({ zone: name, method, cost: COST[method], note: NOTE[method] });
  }

  // a photo that is a different shape than every other photo of the same place
  if (report.dims.aspectChanged) {
    notes.push({
      zone: 'the frame',
      method: 'cropped',
      cost: 18,
      note: 'this is not the shape the rest of them are',
    });
  }

  // moving the whole picture together is the cheapest lie there is
  if (Math.abs(report.gain - 1) > 0.2) {
    notes.push({
      zone: 'the light',
      method: 'dimmed',
      cost: COST.dimmed,
      note: 'the light moved in this, and it moved everywhere at once',
    });
  }

  // worst first, so whoever reads this gets the thing he would actually lead with
  notes.sort((a, b) => b.cost - a.cost);

  const total = Math.round(notes.reduce((s, n) => s + n.cost, 0));
  return { total, notes };
}

/**
 * Painted or drawn over: the structure was destroyed *in place*.
 *
 * The missing check matters. A zone that was cropped off the edge reads as
 * completely changed too, and without this the antagonist accuses you of painting
 * over something that is simply not in the photo any more.
 */
export function looksPainted(z: Reading): boolean {
  return z.missing < 0.45 && z.structure > 0.45 && z.residual > 0.1;
}

/** Soft in a way nothing else at that distance is. */
export function looksBlurred(z: Reading): boolean {
  return z.missing < 0.45 && z.detail < 0.45 && z.bright < 0.88 && z.structure < 0.55;
}
