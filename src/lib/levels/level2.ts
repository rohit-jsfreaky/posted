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
  street_sign: { x: 0.1, y: 0.05, w: 0.16, h: 0.09 },
  witness: { x: 0.42, y: 0.44, w: 0.15, h: 0.26 },
  block: { x: 0.0, y: 0.02, w: 0.62, h: 0.66 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-street');

  if (state.witness) place(ctx, 'cut-subject', ZONES.witness);
  if (state.car) place(ctx, 'cut-car', ZONES.car);

  nightPass(ctx, '#4a5794');

  // the plate is blank in the art, so the game writes the street name
  label(
    ctx,
    'GRASSRIVERS',
    ZONES.street_sign.x + ZONES.street_sign.w / 2,
    ZONES.street_sign.y + ZONES.street_sign.h / 2,
    '#eaf3ee',
    26,
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
        'i drive past there every night, never seen a car sat like that',
      ],
      goal: 'Get the car out of the shot',
      test: (r) => r.zones.car.changed,
      says: 'The car is out of the picture.',
    },
    {
      name: 'dims_restored',
      chatter: [
        'looks like every other shot off that cam',
        'nothing weird about this one',
      ],
      goal: 'Leave the frame the right size',
      test: (r) => !r.dims.changed,
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

  tells: [
    {
      id: 'dimensions',
      whole: true,
      test: (r) => r.dims.changed,
      zone: 'street_sign',
      post: '1440x1080? every cam on that street shoots 1920x1080. this is cropped.',
      fatal: true,
      reverts: 'car_removed',
    },
    {
      id: 'smear',
      test: (r) => looksPainted(r.zones.car),
      zone: 'car',
      post: 'the kerb line stops and starts again. something was painted over it.',
      fatal: true,
      reverts: 'car_removed',
    },
  ],

  reactions: [
    'i drive past there every night, never seen a car parked like that anyway',
    'wait wasnt there a car in this earlier',
    'the plate was readable an hour ago lol',
    'grassrivers at 2am is genuinely scary',
  ],

  tolerance: 55,
  epilogue:
    'The car is gone and the frame is the right size. He replied anyway: "second one this week."',
};
