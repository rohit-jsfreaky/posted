/**
 * Level 1 — "Get me inside".
 *
 * Flags mutate world state. State is the only thing the world is drawn from.
 */

import type { FlagName } from './diff';
import type { WorldState } from './scene';

export const JOB = {
  client: 'gutter_rat_88',
  brief:
    "Club Vantablack. I'm not on the list and I'm not going home. One hour. $200.",
  goal: 'Get through the door.',
  needs: ['bouncer_removed', 'night'] as FlagName[],
};

/** What the street does when a post lands. */
export function applyFlags(
  state: WorldState,
  flags: FlagName[],
): { next: WorldState; changes: string[] } {
  const next: WorldState = { ...state };
  const changes: string[] = [];

  if (flags.includes('night') && next.time !== 'night') {
    next.time = 'night';
    next.crowd = true;
    next.door = 'open';
    changes.push("Sun's down. The place is open and there's a queue.");
  }

  if (flags.includes('bouncer_removed') && next.bouncer) {
    next.bouncer = false;
    changes.push("He's not on the door any more.");
  }

  return { next, changes };
}

export function isSolved(state: WorldState): boolean {
  return !state.bouncer && state.time === 'night' && state.door === 'open';
}
