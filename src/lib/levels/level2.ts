/**
 * Level 2 — "The car was never there"
 *
 * Teaches resize, and resize has exactly one job here: hide that you cropped.
 * He learned the shape trick in Level 1 and now he checks dimensions every time.
 *
 * The car sits against the kerb on the right, so a crop can take it. The street
 * name plate is far left and stays — it is the only thing saying where this is.
 */

import { backdrop, label, nightPass, place, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  car: { x: 0.63, y: 0.51, w: 0.3, h: 0.22 },
  street_sign: { x: 0.107, y: 0.06, w: 0.156, h: 0.1 },
  witness: { x: 0.42, y: 0.44, w: 0.15, h: 0.26 },
  block: { x: 0.0, y: 0.02, w: 0.62, h: 0.66 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-street');

  if (state.witness) place(ctx, 'cut-subject', ZONES.witness);
  if (state.car) place(ctx, 'cut-car', ZONES.car);

  nightPass(ctx, '#4a5794');

  // The plate is blank in the art, so the game writes the street name onto it. The
  // sign hangs at an angle, so the writing is turned to match and held inside the
  // green — flat, full-width text sat over the top edge and off the right end.
  label(
    ctx,
    'GRASSRIVERS',
    ZONES.street_sign.x + ZONES.street_sign.w / 2,
    ZONES.street_sign.y + ZONES.street_sign.h / 2,
    '#eaf3ee',
    22,
    'center',
    8.1,
    ZONES.street_sign.w * 0.88,
  );

  stamp(ctx, 'GRASSRIVERS & 6TH   02:14', '#c2cade');
}

export const level2: Level = {
  id: 2,
  title: 'The car was never there',
  client: 'm_delacroix',
  brief:
    "There's a photo of my car outside a place I was never at. Take the car out. And don't be sloppy, people check.",
  goal: 'Remove the car and leave nothing to check.',
  teaches: 'Resize',
  teachesTool: 'resize',
  tools: ['crop', 'resize', 'filter', 'draw'],
  zones: ZONES,
  initial: { car: true, plate: true, witness: true, dims: 'original' },
  composite,

  flags: [
    {
      name: 'car_removed',
      chatter: [
        'wasnt there a car parked right there earlier',
        'the plate was readable an hour ago lol',
        'nobody parks on that side, the kerb is too high',
      ],
      goal: 'Get the car out of the shot',
      test: (r) => r.zones.car.changed,
      says: 'The car is out of the picture.',
    },
    {
      name: 'dims_restored',
      chatter: [
        'nothing weird about this one',
        'i would not have looked twice at this',
      ],
      goal: 'Leave the frame the right size',
      /**
       * Not "the frame is the right size" — an untouched photo is the right size,
       * and that version of this test handed the flag to anyone who pressed POST IT
       * without editing anything. This is "something came out and the frame still
       * matches the camera", which is the whole trick the level teaches.
       */
      test: (r) => !r.dims.changed && r.zones.car.changed,
      says: 'Nobody can tell the frame was touched.',
    },
  ],
  required: ['car_removed', 'dims_restored'],

  keeps: [
    {
      zone: 'street_sign',
      why: 'the street name is the only thing that says where this photo was taken',
    },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('car_removed')) {
      next.car = false;
      next.plate = false;
    }
    next.dims = flags.includes('dims_restored') ? 'original' : 'cropped';
    return next;
  },

  solved: (s) => !s.car && s.dims === 'original',

  hints: [
    'The car is at the kerb on the right, so the same edge trick works again.',
    'Trouble is, cutting a piece off leaves you with a smaller photo, and he checks the size of everything that comes off that camera.',
    'So take the car off, then open Resize and put it back to 1200 x 800. Same picture, right size, no car.',
  ],
  tells: [
    {
      id: 'dimensions',
      whole: true,
      test: (r) => r.dims.changed,
      zone: 'street_sign',
      post: '1440x1080? every cam on that street shoots 1920x1080. this is cropped.',
      fatal: true,
      reverts: 'car_removed',
      fix: 'Crop the car out, then use Resize to put the photo back to the size it started at.',
    },
    {
      id: 'smear',
      test: (r) => looksPainted(r.zones.car),
      zone: 'car',
      post: 'follow the kerb from the left. it runs, then it stops, then it starts again in the wrong place.',
      fatal: true,
      reverts: 'car_removed',
      fix: 'The car sits against the right kerb. Crop it out of the frame instead of painting over it.',
    },
  ],

  reactions: [
    'grassrivers at 2am is genuinely scary',
    'they still have not fixed the lights on that corner',
    'that whole block is permit parking and nobody checks',
    'why does this street look different every time i see it',
  ],

  tolerance: 55,
  epilogue:
    'The car is gone and the frame is the right size. He replied anyway: "second one this week."',
};
