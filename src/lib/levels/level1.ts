/**
 * Level 1 — "Get me inside"
 *
 * Teaches crop, and the cost of it: a hard crop changes the shape of the photo.
 * He notices, but this time it is only a comment. Level 2 is where it bites.
 */

import { fill, glow, label, nightPass, person, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  bouncer: { x: 0.62, y: 0.4, w: 0.12, h: 0.35 },
  sign: { x: 0.28, y: 0.18, w: 0.3, h: 0.1 },
  door: { x: 0.4, y: 0.35, w: 0.18, h: 0.45 },
  facade: { x: 0.16, y: 0.08, w: 0.68, h: 0.72 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#aab3bd');
  fill(ctx, ZONES.facade, '#8d97a2');

  // windows give the facade structure, so the diff has something to hold on to
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      fill(
        ctx,
        {
          x: 0.16 + 0.68 * (0.06 + i * 0.185),
          y: 0.08 + 0.72 * (0.06 + j * 0.16),
          w: 0.68 * 0.13,
          h: 0.72 * 0.1,
        },
        '#7b858f',
      );
    }
  }

  fill(ctx, { x: 0, y: 0.72, w: 1, h: 0.28 }, '#79828d');
  fill(ctx, { x: 0, y: 0.72, w: 1, h: 0.02 }, '#8a939d');

  fill(ctx, ZONES.sign, '#e6ebf0');
  label(ctx, String(state.sign), 0.43, 0.23, '#2b3138', 30);

  fill(ctx, ZONES.door, '#3c434b');

  if (state.crowd) {
    for (let i = 0; i < 6; i++) {
      person(
        ctx,
        { x: 0.08 + i * 0.13, y: 0.6, w: 0.035, h: 0.22 },
        '#5f6871',
      );
    }
  }

  if (state.bouncer) person(ctx, ZONES.bouncer, '#4a525b', 'BOUNCER');

  if (state.time === 'night') {
    nightPass(ctx);
    glow(ctx, ZONES.sign, '#f4f1ff', 0.02);
    label(ctx, String(state.sign), 0.43, 0.23, '#2b1840', 30);
  }

  if (state.door === 'open') {
    fill(ctx, ZONES.door, state.time === 'night' ? '#f0d79a' : '#c8b88a');
    label(ctx, 'OPEN', 0.49, 0.575, '#5a4520', 24);
  }

  stamp(
    ctx,
    `CLUB VANTABLACK   ${state.time === 'night' ? '23:41' : '14:20'}`,
    state.time === 'night' ? '#b9c2d6' : '#3a4149',
  );
}

export const level1: Level = {
  id: 1,
  title: 'Get me inside',
  client: 'gutter_rat_88',
  brief:
    "Club Vantablack. I'm not on the list and I'm not going home. One hour. $200.",
  goal: 'Get him through the door.',
  teaches: 'Crop',
  tools: ['crop', 'filter', 'draw'],
  zones: ZONES,
  initial: {
    time: 'day',
    bouncer: true,
    sign: 'PRIVATE',
    crowd: false,
    door: 'closed',
  },
  composite,

  flags: [
    {
      name: 'night',
      test: (r) => r.gain < 0.65,
      says: "Sun's down. The place is open and there's a queue.",
    },
    {
      name: 'bouncer_removed',
      test: (r) => r.zones.bouncer.changed,
      says: "He's not on the door any more.",
    },
  ],
  required: ['night', 'bouncer_removed'],

  keeps: [
    { zone: 'facade', why: 'crop the building away and the photo proves nothing' },
    { zone: 'sign', why: 'the sign is what says which club this is' },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('night')) {
      next.time = 'night';
      next.crowd = true;
      next.door = 'open';
    }
    if (flags.includes('bouncer_removed')) next.bouncer = false;
    return next;
  },

  solved: (s) => !s.bouncer && s.time === 'night' && s.door === 'open',

  tells: [
    {
      id: 'shape',
      test: (r) => r.dims.aspectChanged,
      zone: 'facade',
      post: 'why is this photo a different shape than every other pic of vantablack lol',
      fatal: false,
    },
    {
      id: 'painted',
      test: (r) => looksPainted(r.zones.bouncer),
      zone: 'bouncer',
      post: 'zoom in on the right side. that wall has a smudge shaped exactly like a man.',
      fatal: true,
      reverts: 'bouncer_removed',
    },
  ],

  reactions: [
    'queue was mental last night',
    'wait it was open?? i walked past at 9 and it was dead',
    'bro that place has no bouncer now?',
    'my ex works there, can confirm',
    'unrelated but has anyone seen my bike',
  ],

  tolerance: 60,
  epilogue:
    "The client got in. Somebody in the replies is still going on about the shape of the photo.",
};
