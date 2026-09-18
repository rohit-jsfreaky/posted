/**
 * Level 1 — "Get me inside"
 *
 * Teaches crop, and the cost of it: a hard crop changes the shape of the photo.
 * He notices, but this time it is only a comment. Level 2 is where it bites.
 *
 * Zones were measured off the art with a fractional grid (`tools/grid.py`), not
 * estimated. The bouncer stands right of the door and near enough to the edge
 * that a crop can reach him while leaving the facade and the sign — the two
 * KEEPs — intact.
 */

import {
  backdrop,
  fill,
  label,
  nightPass,
  place,
  placeMirrored,
  reset,
  stamp,
  type Ctx,
} from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  bouncer: { x: 0.72, y: 0.44, w: 0.14, h: 0.26 },
  sign: { x: 0.35, y: 0.21, w: 0.3, h: 0.12 },
  door: { x: 0.42, y: 0.41, w: 0.16, h: 0.28 },
  facade: { x: 0.09, y: 0.13, w: 0.81, h: 0.59 },
};

/**
 * Where the queue stands once the place is open.
 *
 * Kept well clear of the bouncer zone on the right: a figure standing inside it
 * would muddy the one reading the whole level turns on. Alternate ones are
 * mirrored so it does not read as the same man printed four times.
 */
const QUEUE = [0.1, 0.21, 0.32, 0.61].map((x, i) => ({
  zone: { x, y: 0.48, w: 0.12, h: 0.2 },
  mirrored: i % 2 === 1,
}));

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-club');

  // the queue is drawn before the night pass so it darkens with everything else
  if (state.crowd) {
    for (const q of QUEUE) {
      if (q.mirrored) placeMirrored(ctx, 'cut-subject', q.zone);
      else place(ctx, 'cut-subject', q.zone);
    }
  }

  if (state.bouncer) place(ctx, 'cut-bouncer', ZONES.bouncer);

  if (state.time === 'night') nightPass(ctx, '#41508c');

  // the sign panel is blank in the art, so the game owns what it says
  fill(ctx, ZONES.sign, state.time === 'night' ? '#f7f2ff' : '#f2eee9');
  label(
    ctx,
    String(state.sign),
    ZONES.sign.x + ZONES.sign.w / 2,
    ZONES.sign.y + ZONES.sign.h / 2,
    '#2b1840',
    46,
  );

  if (state.door === 'open') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    fill(ctx, ZONES.door, state.time === 'night' ? '#9a7a3e' : '#4a3a1c');
    ctx.restore();
    label(ctx, 'OPEN', 0.5, 0.55, '#ffeec4', 30);
  }

  stamp(
    ctx,
    `CLUB VANTABLACK   ${state.time === 'night' ? '23:41' : '14:20'}`,
    state.time === 'night' ? '#cfd7ee' : '#3a3630',
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
      chatter: [
        'wait it was open?? i walked past at 9 and it was dead',
        'queue was mental last night',
        'since when does vantablack have a line out the door',
      ],
      goal: 'Make it night',
      test: (r) => r.gain < 0.65,
      says: "Sun's down. The place is open and there's a queue.",
    },
    {
      name: 'bouncer_removed',
      chatter: [
        'bro that place has no bouncer now?',
        'walked straight in. nobody on the door at all',
        'my ex works there, says the door guy stopped showing up',
      ],
      goal: 'Get him off the door',
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
      whole: true,
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
      fix: 'He stands near the right edge. Crop him out of the frame — paint never matches the wall behind it.',
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
    'The client got in. Somebody in the replies is still going on about the shape of the photo.',
};
