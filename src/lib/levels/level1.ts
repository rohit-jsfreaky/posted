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
 * The queue that appears once the sun is down.
 *
 * Kept well clear of the bouncer zone on the right: a figure standing inside it
 * would muddy the one reading the whole level turns on.
 *
 * It used to be one cut-out placed four times, mirrored on alternate copies,
 * which is a fine trick at a glance and an obvious one the moment somebody looks
 * — the same man, four times, outside the same door. Four people now, and each
 * carries its own width, because they are standing figures of different builds
 * and `place` fills the zone it is given exactly. A shared width would squash
 * them all to the same shape, which is the thing being fixed.
 */
const QUEUE = [
  { art: 'cut-queue-1' as const, x: 0.1, w: 0.054 },
  { art: 'cut-queue-2' as const, x: 0.2, w: 0.056 },
  { art: 'cut-queue-3' as const, x: 0.29, w: 0.058 },
  { art: 'cut-queue-4' as const, x: 0.6, w: 0.063 },
].map((q) => ({ art: q.art, zone: { x: q.x, y: 0.48, w: q.w, h: 0.2 } }));

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-club');

  // the queue is drawn before the night pass so it darkens with everything else
  if (state.crowd) {
    for (const q of QUEUE) {
      place(ctx, q.art, q.zone);
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
  teachesTool: 'crop',
  tools: ['crop', 'filter', 'draw'],
  ambience: 'street',
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
        'queue is mental tonight',
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

  hints: [
    'Two things have to change before this photograph is any use to him. The doorman standing to the right of the door has to go, and it has to be night rather than the middle of the afternoon.',
    'Start with the doorman. Click ERASE in the tool bar on the right. A frame appears over the photo with handles on its edges. Drag the handle on the right edge leftwards, past him, until he is outside the frame. Keep the building and the sign inside it.',
    'Now the time of day. Click LIGHT and drag the Brightness slider down to about -30. A small nudge still looks like the afternoon. Then press POST IT.',
  ],
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
      fix: 'He stands near the right edge of the photo. Use ERASE and drag the right edge of the frame in past him instead — paint never matches the wall behind it.',
    },
  ],

  reactions: [
    'vantablack is the only place open past two round there',
    'that stretch of ocean is dead on a weeknight',
    'the door policy there is a joke honestly',
    'unrelated but has anyone seen my bike',
  ],

  tolerance: 60,
  epilogue:
    'The client got in and paid inside the hour. One reply is still picking at the photograph.',
};
