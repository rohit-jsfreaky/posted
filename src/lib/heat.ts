/**
 * How close he is getting, across the whole run.
 *
 * Suspicion used to be worked out per post and thrown away: the meter showed
 * what the last upload smelled like, and leaving a job wiped it. Two things were
 * wrong with that. Splitting a job over three small posts cost less than doing it
 * in one, which is an exploit rather than a strategy. And nothing carried, so a
 * player who bulldozed every job with the paint brush reached exactly the same
 * ending as one who never gave him a thing — in a game whose whole argument is
 * that he is right and nobody is listening.
 *
 * So it adds up now. Within a job, across the run, and into the last screen.
 *
 * The bands are a ratio rather than a number, because the jobs do not cost the
 * same: the archive tolerates 95 and the street tolerates 55, and a run of five
 * is not comparable to a run of eight. What is comparable is how much of the
 * room you were given you actually used.
 */

import { ALL, MAIN } from './levels';
import type { Progress } from './save';

export type Band = 'nothing' | 'feeling' | 'name';

/**
 * Where you stand, as the file would put it.
 *
 * Carried around together because every screen that shows one of these numbers
 * shows all of them, and because the job you are currently on counts toward the
 * card on its own done-screen before it has been banked.
 */
export type Standing = {
  main: number;
  side: number;
  sideTotal: number;
  /** suspicion, added up over everything finished */
  heat: number;
  /** how much those jobs allowed between them */
  budget: number;
};

/**
 * How much room the jobs behind you allowed, added up.
 *
 * Derived rather than stored: which jobs are done is already in the save, and a
 * second number to keep in step with the first is a second number to get wrong.
 */
export function budgetFor(progress: Progress): number {
  let budget = 0;
  for (let i = 0; i < Math.min(progress.main, MAIN.length); i++) budget += MAIN[i].tolerance;
  for (const id of progress.side) {
    const level = ALL.find((l) => l.id === id);
    if (level) budget += level.tolerance;
  }
  return budget;
}

/**
 * Which of the three he is at.
 *
 * Tuned against what the game actually charges rather than against round
 * numbers. The intended answer to the first job is a crop, and a crop changes
 * the shape of the frame, which costs 18 on its own — his soft tell for that job
 * is literally "why is this photo a different shape than every other pic". So a
 * clean, correct first job lands near four fifths of its allowance, and at the
 * old thresholds a player who did everything right was told he had their name.
 *
 * Under half the allowance means he never had anything to point at. Over it, he
 * has a feeling, which is exactly what that job leaves him with. Past the
 * allowance itself he has been right out loud, repeatedly, with the receipts.
 */
export function bandFor(heat: number, budget: number): Band {
  if (budget <= 0) return 'nothing';
  const used = heat / budget;
  if (used < 0.55) return 'nothing';
  if (used < 0.95) return 'feeling';
  return 'name';
}

/** three words in the header, rather than a number nobody can read in context */
export const CLOSENESS: Record<Band, string> = {
  nothing: 'NOTHING YET',
  feeling: 'A FEELING',
  name: 'A NAME',
};

/** stamped in the corner of the file the city keeps on you */
export const STAMP: Record<Band, string> = {
  nothing: 'CLEAN',
  feeling: 'MARKED',
  name: 'BURNED',
};

/**
 * The last line of the game, which is the only place it can be said.
 *
 * The ending is the same either way — he was right, nobody checked — because
 * that is what the game is about and it does not bend to how tidily you worked.
 * What changes is what it cost you, and whether he ever got close enough to say
 * your name.
 */
export const VERDICT: Record<Band, string> = {
  nothing: 'He never got a name. He is still looking, and he is still right.',
  feeling: 'He has a feeling and a folder full of saved originals. That is usually enough.',
  name: 'He has your handle now. Whatever you post next, he is already waiting under it.',
};
