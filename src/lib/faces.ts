/**
 * Who the handles belong to.
 *
 * The feed was a column of usernames and sentences, which reads as a log file
 * rather than as a street full of people talking about you. Every account that
 * speaks more than once has a face now — the four in the crowd, the six clients
 * who give a name, and him.
 *
 * One account deliberately has no face. The client on jobs four, five and nine
 * is `no name given`, and a blank square where everybody else has a photograph
 * says more about that person than any portrait would.
 *
 * Illustrated, 256px, one contact sheet cut up rather than eleven separate
 * generations, so they are unmistakably the same hand — which matters more at
 * avatar size than any individual likeness does.
 */

const FACES = new Set([
  'cal_hampton_77',
  'marla_qt',
  'boardwalk_dan',
  'nine_lives_vc',
  'leonida_lurker',
  'gutter_rat_88',
  'm_delacroix',
  'r_okafor',
  'w_castellano',
  't_mazur',
  'j_ferreira',
]);

/** The portrait for a handle, or null for somebody who does not have one. */
export function faceFor(handle: string): string | null {
  return FACES.has(handle) ? `/art/faces/${handle}.jpg` : null;
}

/**
 * What to show when there is no photograph.
 *
 * Initials rather than a silhouette, because the whole game is about files on
 * people and a file with no photograph still has a name on it — and because
 * `no name given` resolving to two dashes is exactly right.
 */
export function initialsFor(handle: string): string {
  const letters = handle.replace(/[^a-z0-9]/gi, '');
  return (letters.slice(0, 2) || '--').toUpperCase();
}
