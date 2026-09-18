/**
 * Level 4 — "Put him at the scene"
 *
 * The inverse of every level before it. Removing is easy. Adding is hard, because
 * a pasted object has no shadow and no grain, and this photo has grain everywhere.
 *
 * LEVELS.md planned the counter-move as Filter -> Noise, to grain the pasted car
 * until it matched the plate. Measured against the real editor, that does not
 * work: filters apply to the photo layer and never touch an added object, so the
 * noise grains the whole car park and leaves the pasted car perfectly clean.
 *
 * The obvious replacement — "make its light match" — does not survive either.
 * Brightness cannot be separated from an object's own colour with these measures:
 * a red car really is brighter than a dark grey one, and blending a paste toward
 * the asphalt moves it away from the parked car, not toward it. Rather than ship a
 * requirement resting on a measurement that cannot be justified, the level asks
 * for the two things that can: something is there, and it throws a shadow.
 *
 * The grain is still measured, and he still points at it in the feed. It is an
 * observation the player cannot act on inside this editor, so it costs them
 * nothing — it just tells them he is looking closely.
 */

import { fill, grain, label, nightPass, person, reset, shadow, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { below, type ZoneMap } from '../zones';

const SPOT = { x: 0.4, y: 0.46, w: 0.26, h: 0.18 };

const ZONES: ZoneMap = {
  spot: SPOT,
  spot_shadow: below(SPOT, 0.07),
  parked: { x: 0.06, y: 0.46, w: 0.24, h: 0.18 },
  gate: { x: 0.78, y: 0.3, w: 0.18, h: 0.34 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#7d8590');
  fill(ctx, { x: 0, y: 0, w: 1, h: 0.36 }, '#69727e');
  fill(ctx, { x: 0, y: 0.36, w: 1, h: 0.64 }, '#8a929c');

  // a fence along the back, then bay markings. A car park is mostly flat, and a
  // flat photo gives the alignment search nothing to lock onto, so the scene
  // needs real structure in both directions
  fill(ctx, { x: 0, y: 0.3, w: 1, h: 0.012 }, '#59616b');
  for (let i = 0; i < 14; i++) {
    fill(ctx, { x: 0.02 + i * 0.07, y: 0.24, w: 0.008, h: 0.12 }, '#5e666f');
  }
  for (let i = 0; i < 6; i++) {
    fill(ctx, { x: 0.05 + i * 0.16, y: 0.08, w: 0.1, h: 0.16 }, '#737c86');
    fill(ctx, { x: 0.07 + i * 0.16, y: 0.12, w: 0.055, h: 0.08 }, '#616a74');
  }

  // light poles
  for (const px of [0.22, 0.68]) {
    fill(ctx, { x: px, y: 0.1, w: 0.01, h: 0.3 }, '#525a64');
    fill(ctx, { x: px - 0.025, y: 0.09, w: 0.06, h: 0.02 }, '#767f8a');
  }

  for (let i = 0; i < 5; i++) {
    fill(ctx, { x: 0.04 + i * 0.18, y: 0.44, w: 0.006, h: 0.26 }, '#b5bcc4');
  }
  fill(ctx, { x: 0, y: 0.7, w: 1, h: 0.01 }, '#b5bcc4');
  fill(ctx, { x: 0, y: 0.78, w: 1, h: 0.012 }, '#98a0aa');
  for (let i = 0; i < 9; i++) {
    fill(ctx, { x: 0.03 + i * 0.11, y: 0.86, w: 0.06, h: 0.01 }, '#a7aeb7');
  }

  // a car that is genuinely there, with a shadow. this is the reference the
  // antagonist compares against
  fill(ctx, ZONES.parked, '#5a626d');
  fill(ctx, { x: 0.1, y: 0.42, w: 0.16, h: 0.06 }, '#68717c');
  fill(ctx, { x: 0.115, y: 0.435, w: 0.055, h: 0.035 }, '#98a3ae');
  fill(ctx, { x: 0.195, y: 0.435, w: 0.055, h: 0.035 }, '#98a3ae');
  shadow(ctx, ZONES.parked);
  label(ctx, 'NOT HIS', 0.18, 0.56, '#c9d0d8', 16);

  // the gate and the attendant
  fill(ctx, ZONES.gate, '#4e5660');
  fill(ctx, { x: 0.78, y: 0.3, w: 0.18, h: 0.03 }, '#626a75');
  label(ctx, 'GATE 3', 0.87, 0.47, '#c9d0d8', 18);
  person(ctx, { x: 0.72, y: 0.44, w: 0.05, h: 0.2 }, '#555d67');

  if (state.car) {
    fill(ctx, SPOT, '#6d5a4a');
    fill(ctx, { x: 0.44, y: 0.42, w: 0.18, h: 0.06 }, '#7c6857');
    fill(ctx, { x: 0.455, y: 0.435, w: 0.06, h: 0.035 }, '#a08b78');
    fill(ctx, { x: 0.545, y: 0.435, w: 0.06, h: 0.035 }, '#a08b78');
    label(ctx, 'HIS CAR', 0.53, 0.56, '#e2d6c9', 16);
  }
  if (state.shadow) shadow(ctx, SPOT);

  // a floodlit lot, not a black one. A near-black scene makes "match the light"
  // impossible: anything bright enough to read as a car is automatically too
  // bright to belong.
  nightPass(ctx, '#9aa2c2');
  stamp(ctx, 'PORT GELLHORN LOT   21:02', '#cdd4e2');

  // the photo's own grain. a pasted object with clean edges will not match it
  grain(ctx, 15, 41);
}

export const level4: Level = {
  id: 4,
  title: 'Put him at the scene',
  client: 'unlisted',
  brief:
    "Different job. I need his car in bay four at nine last night. It wasn't. Make it have been.",
  goal: 'Put the car in the empty bay, and make it belong there.',
  teaches: 'Stickers, and the light that makes them belong',
  tools: ['crop', 'resize', 'filter', 'draw', 'stickers', 'shapes'],
  zones: ZONES,
  initial: { car: false, shadow: false },
  composite,

  flags: [
    {
      name: 'car_placed',
      test: (r) => r.zones.spot.changed,
      says: "There's a car in bay four.",
    },
    {
      name: 'shadow_added',
      // something darker than predicted, sitting on the ground under it
      test: (r) => r.zones.spot_shadow.drift < -0.035,
      says: 'It throws a shadow like everything else at that hour.',
    },
  ],
  required: ['car_placed', 'shadow_added'],

  keeps: [
    { zone: 'gate', why: 'the gate number is what places the photo in that lot' },
    { zone: 'parked', why: 'take the other car out and the bay markings stop lining up' },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('car_placed')) next.car = true;
    if (flags.includes('shadow_added')) next.shadow = true;
    return next;
  },

  solved: (s) => Boolean(s.car && s.shadow),

  tells: [
    {
      id: 'no_shadow',
      test: (r) => r.zones.spot.changed && r.zones.spot_shadow.drift > -0.035,
      zone: 'spot_shadow',
      post: 'the car has no shadow. everything else at 9pm has a shadow.',
      fatal: true,
      reverts: 'car_placed',
    },
    {
      // he notices the clean paste even when it does not cost you the job
      id: 'too_clean',
      test: (r) =>
        r.zones.spot.changed &&
        r.zones.spot.grain < 0.4 * (r.zones.parked.grain + r.zones.gate.grain) / 2,
      zone: 'spot',
      post: 'zoom all the way in. the whole photo is noisy except that one car.',
      fatal: false,
    },
  ],

  reactions: [
    'bay four is always empty tho',
    'gate 3 camera is broken half the time',
    'i park there every day, never seen that car',
    'why is everyone suddenly a photo expert',
  ],

  tolerance: 70,
  epilogue:
    'The car was in bay four all along. Somebody is building a thread about you.',
};
