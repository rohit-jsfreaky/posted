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
 * The light on the glass matters mechanically, so it is painted into the
 * background art rather than drawn on at runtime — a radial flare has no edges of
 * its own and read as a lamp hanging off the front of the building. On the file
 * the pane measures 0.83 mean luma against 0.54 for the whole frame, which is
 * what the cheapest solution needs: brighten the photo and the glass is the first
 * thing in it to clip. The ghost sits just under that, so the two go together.
 */

import {
  backdrop,
  label,
  nightPass,
  place,
  placeFlipped,
  placeMirrored,
  patch,
  reset,
  stamp,
  type Ctx,
} from '../draw';
import type { Level, WorldState } from '../level';
import { looksBlurred, looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  subject: { x: 0.4, y: 0.44, w: 0.16, h: 0.26 },
  reflection: { x: 0.665, y: 0.325, w: 0.135, h: 0.205 },
  water: { x: 0.4, y: 0.73, w: 0.16, h: 0.17 },
  clock: { x: 0.17, y: 0.06, w: 0.09, h: 0.14 },
  boat: { x: 0.0, y: 0.45, w: 0.24, h: 0.3 },
  dock: { x: 0.24, y: 0.6, w: 0.72, h: 0.13 },
};

/** His shape inside the glass — smaller, and set back into the window. */
const GHOST = { x: 0.688, y: 0.345, w: 0.09, h: 0.165 };

/**
 * The glass itself, measured off the art.
 *
 * The sun on this window is in the background art now rather than drawn on at
 * runtime, which is the difference between a photograph of a lit window and a
 * lamp stuck to the front of a building.
 */
const PANE = { x: 0.616, y: 0.3, w: 0.297, h: 0.3 };

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-marina');

  if (state.subject) place(ctx, 'cut-subject', ZONES.subject);
  if (state.water) placeFlipped(ctx, 'cut-subject', ZONES.water, 0.42);

  nightPass(ctx, '#5a6699');

  // The sky goes to evening; the window does not. Sun is already on that glass in
  // the art, so the pane is laid back over the evening pass untouched. Measured on
  // the file, the pane reads 0.83 mean luma against 0.54 for the whole frame,
  // which is what the cheapest solution needs: brighten the photo and the glass is
  // the first thing in it to clip. The ghost sits just under that, close enough in
  // tone that the two blow out together and faint enough to read as a reflection.
  patch(ctx, 'bg-marina', PANE);
  if (state.reflection) placeMirrored(ctx, 'cut-subject', GHOST, 0.17);

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
  teachesTool: 'filter',
  tools: ['crop', 'resize', 'filter', 'draw', 'shapes'],
  ambience: 'water',
  zones: ZONES,
  initial: { subject: true, reflection: true, water: true, clock: '21:40' },
  composite,

  flags: [
    {
      name: 'subject_removed',
      chatter: [
        'thought there was someone standing on the dock in this',
        'empty dock at half nine, sounds about right for ambrosia',
      ],
      goal: 'Him, off the dock',
      test: (r) => r.zones.subject.changed,
      says: "He's not on the dock.",
    },
    {
      name: 'reflection_removed',
      chatter: [
        'that window is just glare now',
        'nice light coming off the glass',
      ],
      goal: 'Him, out of the window',
      test: (r) => r.zones.reflection.changed,
      says: 'The window is just a window now.',
    },
    {
      name: 'water_removed',
      chatter: [
        'waters dead calm. nothing in it',
        'not so much as a ripple out there',
      ],
      goal: 'Him, out of the water',
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

  hints: [
    'He is in this photograph three times: standing on the dock, reflected in the window behind him, and again in the water below. All three have to go.',
    'The window is in the middle of the frame, so ERASE cannot reach it. Click LIGHT and drag Brightness up instead, to about +40, until the glass burns out to white and takes the reflection with it.',
    'For the man on the dock and his reflection in the water, click BOARD UP, drop a rectangle over each of them, and set its colour to something already in the photo — the grey of the dock, the dark of the water. A patch in a colour that is nowhere else is the first thing he spots. Then press POST IT.',
  ],
  tells: [
    {
      id: 'blob_on_the_dock',
      test: (r) => looksPainted(r.zones.subject),
      zone: 'subject',
      post: 'theres a patch on the dock that is not the colour of anything near it.',
      fatal: true,
      reverts: 'subject_removed',
      fix: 'Use BOARD UP and set the rectangle to a colour the dock actually is. A patch in a colour that is nowhere else in the photo is the thing he looks for.',
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
      fix: 'Only the window has to go. Click LIGHT and drag Brightness up to about +40 until the glass burns out, rather than blurring the whole photograph.',
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
    'Three of him, gone in one post. He replied with a screenshot of all three, side by side.',
};
