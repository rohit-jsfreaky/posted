/**
 * Level 9 — "He never posted that" (side work)
 *
 * The photograph is not a photograph. It is a screenshot of him.
 *
 * Every other job hands you a picture of the world and asks you to change what
 * the world contains. This one hands you a picture of *the man who has spent the
 * week catching you*, and asks you to change what he said. His own post about
 * your first forgery — the club, the doorman who is not on the door any more,
 * and his line underneath it saying he still has the original.
 *
 * Two things have to go, and they are the two things that make any post
 * believable:
 *
 *   what he said        REWRITE, and then the game asks you what you wrote,
 *                       because the editor hands back pixels and not words
 *   what he attached    the photograph under it, cropped off the bottom or
 *                       boarded over in the panel's own colour
 *
 * What is left is a man making an accusation with nothing under it, in his own
 * words, from his own account. The crowd does not check. They never do — which
 * is the sentence the whole game is built on, turned around and pointed at the
 * only person in Leonida it was ever true about.
 *
 * It needs no new art. The attachment is `bg-club` under the same night pass the
 * first job's world uses, drawn into a rectangle; everything else is interface,
 * and interface is flat colour and type, which is what this game draws anyway.
 *
 * It is also the one job where a filter is the wrong answer and says so. Nobody
 * colour grades a screenshot, and he notices.
 */

import { fill, label, place, reset, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import { toPixels, type ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  /** his handle. Change it and it stops being his post at all */
  handle: { x: 0.14, y: 0.05, w: 0.34, h: 0.055 },
  /** the line he wrote, which is the thing being replaced */
  quote: { x: 0.14, y: 0.13, w: 0.72, h: 0.085 },
  /** the photograph he attached as proof — 3:2, so the art is not stretched */
  proof: { x: 0.17, y: 0.26, w: 0.66, h: 0.66 },
};

/** the card the post sits on */
const CARD = { x: 0.1, y: 0.02, w: 0.8, h: 0.96 };

/** what he actually posted, before you get to it */
const SAID = 'the vantablack pic is fake. i still have the original.';

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  // the app behind the screenshot, then the post itself
  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#08080a');
  fill(ctx, CARD, '#12141b');
  fill(ctx, { x: CARD.x, y: CARD.y, w: 0.004, h: CARD.h }, '#ff2e7e');

  label(ctx, '@cal_hampton_77', ZONES.handle.x, ZONES.handle.y + ZONES.handle.h / 2, '#ff2e7e', 30, 'left');
  label(ctx, '2h', CARD.x + CARD.w - 0.03, ZONES.handle.y + ZONES.handle.h / 2, '#55555e', 22, 'right');

  label(
    ctx,
    state.quote ? String(state.quote) : SAID,
    ZONES.quote.x,
    ZONES.quote.y + ZONES.quote.h / 2,
    '#f2f2f4',
    30,
    'left',
    0,
    ZONES.quote.w * 0.98,
  );

  if (state.proof) {
    place(ctx, 'bg-club', ZONES.proof);
    // the same night the first job's street ended up in, over this rectangle only
    const px = toPixels(ZONES.proof, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#41508c';
    ctx.fillRect(px.x, px.y, px.w, px.h);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    label(ctx, '2,214 replies', ZONES.proof.x, 0.945, '#55555e', 20, 'left');
  } else {
    // an accusation with nothing under it
    fill(ctx, { x: ZONES.proof.x, y: 0.3, w: ZONES.proof.w, h: 0.002 }, '#24242a');
    label(ctx, 'no attachment', ZONES.proof.x, 0.36, '#55555e', 24, 'left');
    label(ctx, '2,214 replies', ZONES.proof.x, 0.42, '#55555e', 20, 'left');
  }
}

export const level9: Level = {
  id: 9,
  title: 'He never posted that',
  client: 'no name given',
  brief:
    'There is an account that keeps calling my photographs fake. I want a screenshot of him saying something else, and I want it to be the only version anybody has seen by morning.',
  goal: 'Turn his own post against him.',
  teaches: 'Text, on the one picture in the game that is not a photograph',
  teachesTool: 'text',
  tools: ['crop', 'resize', 'filter', 'draw', 'text', 'shapes'],
  ambience: 'inside',
  zones: ZONES,
  initial: { proof: true, quote: '' },
  composite,

  flags: [
    {
      name: 'quote_changed',
      chatter: [
        'wait he actually posted that',
        'screenshot or it didnt happen. and there it is',
      ],
      goal: 'Put different words in his mouth',
      test: (r) => r.zones.quote.changed,
      says: 'The post says whatever you wrote it says.',
    },
    {
      name: 'proof_gone',
      chatter: [
        'big words for a man with nothing attached',
        'he does this every week and never actually shows anything',
      ],
      goal: 'Take his evidence out from under it',
      test: (r) => r.zones.proof.changed,
      says: 'There is nothing under it any more.',
    },
  ],
  required: ['quote_changed', 'proof_gone'],

  keeps: [{ zone: 'handle', why: 'the handle is the only thing that says whose post this is' }],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('proof_gone')) next.proof = false;
    return next;
  },

  // `quote` is written in by the choice box rather than by a flag, the same way
  // the case number is in the archive job
  solved: (s) => !s.proof && Boolean(s.quote),

  choice: {
    when: 'quote_changed',
    prompt: 'What did you make him say?',
    placeholder: 'i made the whole thing up',
    maxLength: 52,
    key: 'quote',
  },

  tells: [
    {
      /**
       * The recursive one: he catches you forging a screenshot of him.
       *
       * Paint is the wrong tool against an interface for a reason that is easy to
       * see once it is said — a post is flat colour, and nothing you brush over
       * it will ever be the same flat colour.
       */
      id: 'smeared_proof',
      test: (r) => looksPainted(r.zones.proof),
      zone: 'proof',
      post: 'somebody has painted over the bottom of a screenshot of me. badly. i still have the post.',
      fatal: true,
      reverts: 'proof_gone',
      fix: 'Crop the attachment off the bottom, or board it over in the panel colour. Paint never matches a flat interface.',
    },
    {
      /** nobody colour grades a screenshot, and this is the job that knows it */
      id: 'graded',
      whole: true,
      test: (r) => Math.abs(r.gain - 1) > 0.2,
      zone: 'quote',
      post: 'why is a screenshot of a phone screen colour graded lmao',
      fatal: false,
    },
  ],

  hints: [
    'This one is not a photograph. It is a picture of a post, and what makes a post believable is not what makes a photograph believable.',
    'Two things have to go: what he said, and what he attached underneath to prove it. REWRITE reaches the first one, and the game will ask you what you wrote, because the editor hands back pixels rather than words.',
    'For the attachment, crop it off the bottom or board it over in the same colour the panel already is. Do not paint it — a post is flat colour and a brush never matches flat colour, and that is the first thing he checks.',
  ],

  reactions: [
    'this account is always so sure about everything',
    'imagine caring this much about a photo of a nightclub',
    'he was right about the marina though',
    'muting this guy honestly',
  ],

  tolerance: 70,

  epilogue:
    'He spent the evening telling people he never wrote it. Nobody could work out which screenshot was the real one, so they stopped trying.',
};
