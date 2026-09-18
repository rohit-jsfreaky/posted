/**
 * Level 3 — "He can't be in the reflection"
 *
 * The design thesis in one puzzle. He is standing on the dock, mirrored in the
 * window, and mirrored again in the water. Crop — the obvious tool, the one every
 * other entry is built on — physically cannot reach the middle of a frame.
 *
 * Four ways to reach the window, at four different prices. Measured against the
 * real editor, not assumed: its Blur slider works on the whole photo, not on a
 * region, so "blur just the window" is not a move this editor can make. What is
 * left is still a real choice:
 *
 *   brightness up until it clips   cheapest — real photos blow highlights out
 *   cover it in a matching colour  medium — it reads as glare if you pick well
 *   sticker over it                medium — if the object belongs in the scene
 *   paint a crude blob over it     expensive — the colour never matches
 *   crop                           impossible, the window is mid-frame
 *
 * Shapes are here as well as draw, because covering something is only cheap when
 * the colour you cover it with belongs in the photo.
 *
 * The glare pass matters mechanically. The window in the art is mid-toned, and
 * the cheapest solution needs it to be the first thing that clips when the whole
 * photo is brightened. So the glass gets lit, and the ghost in it is drawn faint
 * on top, close enough in tone that the two blow out together.
 */

import {
  backdrop,
  glare,
  label,
  nightPass,
  place,
  placeFlipped,
  placeMirrored,
  reset,
  stamp,
  type Ctx,
} from '../draw';
import type { Level, WorldState } from '../level';
import { looksBlurred, looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  subject: { x: 0.4, y: 0.44, w: 0.16, h: 0.26 },
  reflection: { x: 0.62, y: 0.3, w: 0.24, h: 0.26 },
  water: { x: 0.4, y: 0.73, w: 0.16, h: 0.17 },
  clock: { x: 0.17, y: 0.06, w: 0.09, h: 0.14 },
  boat: { x: 0.0, y: 0.45, w: 0.24, h: 0.3 },
  dock: { x: 0.24, y: 0.6, w: 0.72, h: 0.13 },
};

/** His shape inside the glass — smaller, and set back into the window. */
const GHOST = { x: 0.68, y: 0.34, w: 0.1, h: 0.18 };

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-marina');

  if (state.subject) place(ctx, 'cut-subject', ZONES.subject);
  if (state.water) placeFlipped(ctx, 'cut-subject', ZONES.water, 0.42);

  nightPass(ctx, '#5a6699');

  // sun on the glass, so the window is the brightest thing in the shot
  glare(ctx, ZONES.reflection, 0.62);
  if (state.reflection) placeMirrored(ctx, 'cut-subject', GHOST, 0.3);

  label(
    ctx,
    String(state.clock),
    ZONES.clock.x + ZONES.clock.w / 2,
    ZONES.clock.y + ZONES.clock.h / 2,
    '#2a3040',
    30,
  );

  stamp(ctx, 'AMBROSIA MARINA   21:40', '#cfd7ee');
}

export const level3: Level = {
  id: 3,
  title: "He can't be in the reflection",
  client: 'r_okafor',
  brief:
    "My brother wasn't at the marina that night. He's in the shot, he's in the window, and he's in the water. All three.",
  goal: 'Take him out of the photo. All three of him.',
  teaches: 'Filter, properly: brightness, blur, pixelate',
  tools: ['crop', 'resize', 'filter', 'draw', 'shapes'],
  zones: ZONES,
  initial: { subject: true, reflection: true, water: true, clock: '21:40' },
  composite,

  flags: [
    {
      name: 'subject_removed',
      test: (r) => r.zones.subject.changed,
      says: "He's not on the dock.",
    },
    {
      name: 'reflection_removed',
      test: (r) => r.zones.reflection.changed,
      says: 'The window is just a window now.',
    },
    {
      name: 'water_removed',
      test: (r) => r.zones.water.changed,
      says: 'Nothing in the water either.',
    },
  ],
  required: ['subject_removed', 'reflection_removed', 'water_removed'],

  keeps: [
    { zone: 'boat', why: 'the boat is what proves this is that marina' },
    { zone: 'dock', why: 'lose the dock and it could be anywhere' },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('subject_removed')) next.subject = false;
    if (flags.includes('reflection_removed')) next.reflection = false;
    if (flags.includes('water_removed')) next.water = false;
    return next;
  },

  solved: (s) => !s.subject && !s.reflection && !s.water,

  tells: [
    {
      id: 'blob_on_the_dock',
      test: (r) => looksPainted(r.zones.subject),
      zone: 'subject',
      post: 'theres a patch on the dock that is not the colour of anything near it.',
      fatal: true,
      reverts: 'subject_removed',
    },
    {
      id: 'whole_thing_smeared',
      test: (r) =>
        looksBlurred(r.zones.boat) &&
        looksBlurred(r.zones.dock) &&
        looksBlurred(r.zones.clock),
      zone: 'clock',
      post: 'the entire photo is smeared. thats not depth of field, thats someone hiding something.',
      fatal: true,
      reverts: 'reflection_removed',
    },
  ],

  reactions: [
    'ambrosia marina at night is unreal',
    'thats a nice boat',
    'hang on i was there that night',
    'the clock says 21:40, tide would be way out by then',
    'why does everyone care about this photo',
  ],

  tolerance: 85,
  epilogue:
    'Three of him, gone in one post. He replied with a screenshot of your last four jobs side by side.',
};
