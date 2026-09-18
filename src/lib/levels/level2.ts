/**
 * Level 2 — "The car was never there"
 *
 * Teaches resize, and resize has exactly one job here: hide that you cropped.
 * He learned the shape trick in Level 1 and now he checks dimensions every time.
 */

import { fill, label, nightPass, person, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  car: { x: 0.62, y: 0.54, w: 0.3, h: 0.16 },
  street_sign: { x: 0.06, y: 0.2, w: 0.2, h: 0.08 },
  witness: { x: 0.42, y: 0.46, w: 0.07, h: 0.26 },
  block: { x: 0.0, y: 0.1, w: 0.58, h: 0.62 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#9aa4b0');
  fill(ctx, ZONES.block, '#828d99');

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      fill(
        ctx,
        { x: 0.05 + i * 0.13, y: 0.16 + j * 0.16, w: 0.08, h: 0.1 },
        '#6f7a86',
      );
    }
  }

  // road
  fill(ctx, { x: 0, y: 0.7, w: 1, h: 0.3 }, '#727c88');
  fill(ctx, { x: 0, y: 0.7, w: 1, h: 0.015 }, '#8d959f');
  for (let i = 0; i < 8; i++) {
    fill(ctx, { x: 0.02 + i * 0.13, y: 0.86, w: 0.07, h: 0.012 }, '#aeb6bf');
  }

  // the street name sign on its pole — this is the KEEP
  fill(ctx, { x: 0.15, y: 0.28, w: 0.012, h: 0.42 }, '#5e6874');
  fill(ctx, ZONES.street_sign, '#dfe5ea');
  label(ctx, 'GRASSRIVERS', 0.16, 0.24, '#2b3138', 20);

  if (state.witness) person(ctx, ZONES.witness, '#4e5661', 'WITNESS');

  if (state.car) {
    fill(ctx, ZONES.car, '#59626e');
    fill(ctx, { x: 0.66, y: 0.5, w: 0.2, h: 0.06 }, '#69727e');
    fill(ctx, { x: 0.68, y: 0.515, w: 0.07, h: 0.035 }, '#93a0ad');
    fill(ctx, { x: 0.77, y: 0.515, w: 0.07, h: 0.035 }, '#93a0ad');
    if (state.plate) {
      fill(ctx, { x: 0.7, y: 0.645, w: 0.1, h: 0.035 }, '#e8edf1');
      label(ctx, 'LEO 4412', 0.75, 0.6625, '#2b3138', 17);
    }
    label(ctx, 'HIS CAR', 0.77, 0.6, '#c3cbd4', 16);
  }

  nightPass(ctx, '#3f4a7d');
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
      test: (r) => r.zones.car.changed,
      says: 'The car is out of the picture.',
    },
    {
      name: 'dims_restored',
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
