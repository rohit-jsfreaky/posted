/**
 * Level 3 — "He can't be in the reflection"
 *
 * The design thesis in one puzzle. He is standing on the dock, mirrored in the
 * window, and mirrored again in the water. Crop — the obvious tool, the one every
 * other entry is built on — physically cannot reach the middle of a frame.
 *
 * Four tools reach the window at four different prices:
 *   brightness up until it clips   cheapest — real photos blow highlights out
 *   blur it                        cheap, but only if nothing else is sharp
 *   cover it with something        medium
 *   paint over it                  expensive, the edges give it away
 */

import { fill, label, person, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksBlurred, looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  subject: { x: 0.44, y: 0.38, w: 0.1, h: 0.4 },
  reflection: { x: 0.7, y: 0.3, w: 0.14, h: 0.22 },
  water: { x: 0.4, y: 0.83, w: 0.16, h: 0.15 },
  clock: { x: 0.12, y: 0.22, w: 0.09, h: 0.09 },
  boat: { x: 0.04, y: 0.54, w: 0.26, h: 0.2 },
  dock: { x: 0.0, y: 0.74, w: 1.0, h: 0.06 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  // night sky and far water
  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#222a3d');
  fill(ctx, { x: 0, y: 0.8, w: 1, h: 0.2 }, '#1b2233');

  // the harbour building on the right
  fill(ctx, { x: 0.62, y: 0.1, w: 0.38, h: 0.64 }, '#2c344a');
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      fill(
        ctx,
        { x: 0.66 + i * 0.16, y: 0.56 + j * 0.08, w: 0.1, h: 0.05 },
        '#3a4358',
      );
    }
  }

  // the lit window. it is the brightest thing in the shot on purpose: raise the
  // global brightness far enough and this is what clips first
  fill(ctx, ZONES.reflection, '#e9e6f5');
  if (state.reflection) {
    // his shape, mirrored in the glass
    // faint, the way a reflection in a lit window actually is. Raise the global
    // brightness far enough and the window and the ghost in it clip together
    person(
      ctx,
      { x: 0.735, y: 0.335, w: 0.05, h: 0.17 },
      '#cfcadd',
    );
  }
  fill(ctx, { x: 0.7, y: 0.4, w: 0.14, h: 0.006 }, '#b9b6c9');

  // boat on the left — a KEEP
  fill(ctx, ZONES.boat, '#39435c');
  fill(ctx, { x: 0.1, y: 0.46, w: 0.05, h: 0.09 }, '#4a5570');
  fill(ctx, { x: 0.08, y: 0.5, w: 0.16, h: 0.05 }, '#4a5570');
  label(ctx, 'BOAT', 0.17, 0.64, '#93a0bb', 18);

  // the dock — a KEEP
  fill(ctx, ZONES.dock, '#4b5064');
  fill(ctx, { x: 0, y: 0.74, w: 1, h: 0.008 }, '#626983');

  // clock on a post
  fill(ctx, { x: 0.16, y: 0.3, w: 0.01, h: 0.44 }, '#39415a');
  fill(ctx, ZONES.clock, '#cdd3e2');
  label(ctx, String(state.clock), 0.165, 0.265, '#20263a', 19);

  if (state.subject) person(ctx, ZONES.subject, '#5b6379', 'HIM');

  // his reflection in the water, flipped and dimmer
  if (state.water) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(0, ZONES.water.y * ctx.canvas.height * 2 + 30);
    ctx.scale(1, -1);
    person(ctx, { x: 0.44, y: 0.83, w: 0.1, h: 0.15 }, '#6b7389');
    ctx.restore();
  }

  stamp(ctx, 'AMBROSIA MARINA   21:40', '#9fa9c4');
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
    {
      id: 'water_smear',
      test: (r) => looksPainted(r.zones.water),
      zone: 'water',
      post: 'water doesnt have straight edges. that patch does.',
      fatal: true,
      reverts: 'water_removed',
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
