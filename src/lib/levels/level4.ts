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

import { backdrop, place, reset, shadow, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { below, type ZoneMap } from '../zones';

const SPOT = { x: 0.32, y: 0.52, w: 0.3, h: 0.22 };

const ZONES: ZoneMap = {
  spot: SPOT,
  spot_shadow: below(SPOT, 0.07),
  parked: { x: 0.0, y: 0.4, w: 0.25, h: 0.32 },
  gate: { x: 0.76, y: 0.24, w: 0.21, h: 0.38 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-lot');

  // No night pass here. The job moved to the middle of the day, because a lot
  // dark enough to read as 9pm is a lot where nothing pasted in can look like it
  // belongs, and the shadow the level asks for stops being legible.
  if (state.car) place(ctx, 'cut-car', SPOT);
  if (state.shadow) shadow(ctx, SPOT);

  stamp(ctx, 'PORT GELLHORN LOT   13:40', '#2f3a42');
}

export const level4: Level = {
  id: 4,
  title: 'Put him at the scene',
  client: 'unlisted',
  brief:
    "Different job. I need his car in bay four at half one yesterday. It wasn't. Make it have been.",
  goal: 'Put the car in the empty bay, and make it belong there.',
  teaches: 'Stickers, and the light that makes them belong',
  tools: ['crop', 'resize', 'filter', 'draw', 'stickers', 'shapes'],
  zones: ZONES,
  initial: { car: false, shadow: false },
  composite,

  flags: [
    {
      name: 'car_placed',
      chatter: [
        'thats his car sat in bay four',
        'bay four is never taken, thats the weird bit',
      ],
      goal: 'Put his car in the empty bay',
      test: (r) => r.zones.spot.changed,
      says: "There's a car in bay four.",
    },
    {
      name: 'shadow_added',
      chatter: [
        'shadow lines up with everything else in the lot',
        'middle of the day, checks out',
      ],
      goal: 'Give it a shadow',
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

  hints: [
    'This one adds instead of removing. Bay four is the empty space in the middle. Open Stickers and scroll past the emoticons and the doodles to TRANSPORTATION — the car is in there. Drag it into the bay.',
    'Anything standing in that lot at half one throws a shadow, and a pasted car does not. Open Draw, and before you touch the photo change the brush colour to black and pull the size slider right up — it starts red and thin. Then lay a flat dark band along the bottom of the car where it meets the tarmac.',
    'He will still say the car is too clean against the rest of the grain, and he is right. Nothing in this editor grains something you pasted on — the filters only reach the photo underneath it. Let him say it; it does not cost you the job.',
  ],
  tells: [
    {
      id: 'no_shadow',
      test: (r) => r.zones.spot.changed && r.zones.spot_shadow.drift > -0.035,
      zone: 'spot_shadow',
      post: 'the car has no shadow. everything else in this lot has a shadow.',
      fatal: true,
      reverts: 'car_placed',
      fix: 'Draw a soft dark shape on the ground under the car. Everything else in that lot throws one.',
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
