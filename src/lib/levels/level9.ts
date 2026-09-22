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
 *   what he attached    the photograph under it, boarded over in the panel's
 *                       own colour
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
 * It is also the one job where two familiar tools are both wrong, and it says so
 * rather than letting them fail quietly. A filter is wrong because nobody colour
 * grades a screenshot, and he posts about it. Crop is wrong because the
 * attachment is most of the frame, so cutting it away leaves a strip that no
 * longer reads as a screenshot of anything — the engine refuses to place it, and
 * a person would say the same thing about it.
 */

import { fill, label, place, reset, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import { toPixels, type ZoneMap } from '../zones';

/** his photograph, beside his handle. Not a zone: nothing is measured on it */
const FACE = { x: 0.305, y: 0.082, w: 0.038, h: 0.057 };

const ZONES: ZoneMap = {
  /** his handle. Change it and it stops being his post at all */
  handle: { x: 0.355, y: 0.085, w: 0.28, h: 0.05 },
  /**
   * The two lines he wrote, which are the thing being replaced.
   *
   * 468px wide rather than the 864 it was. A band the width of the whole frame
   * could not feel a typed sentence landing in it — the change was real and far
   * too small a share of the area to move either reading.
   */
  quote: { x: 0.305, y: 0.155, w: 0.39, h: 0.09 },
  /** the photograph he attached as proof — 3:2, so the art is not stretched */
  proof: { x: 0.305, y: 0.26, w: 0.39, h: 0.39 },
};

/**
 * The card, portrait, because a post is a thing people screenshot on a phone.
 *
 * Also the reason the numbers work. Filling the frame made the attachment 44% of
 * the picture, and covering that much of it dragged the global photometric fit
 * to a gain of 1.53, which clipped the untouched parts of the card to white and
 * reported them as changed. At this size the attachment is about 15%, which the
 * trimmed fit absorbs.
 */
const CARD = { x: 0.28, y: 0.05, w: 0.44, h: 0.67 };

/**
 * The card is light, and that is a mechanic rather than a taste.
 *
 * It was the same near-black as the rest of the game, and the editor writes in
 * dark grey — so a player could not see what they had typed, and the diff could
 * not either. A short word in low contrast across an 864px band moves neither
 * the structure reading nor the brightness one, and the post came back "nothing
 * changed" after they had done exactly what they were told. Dark on near-white
 * is legible to both, and it is what a screenshot of a post looks like anyway.
 */
const PAPER = '#eceef2';
const INK = '#16181d';
const FAINT = '#6b7078';

/** what he actually posted, before you get to it, on the two lines it takes */
const SAID = ['the vantablack pic is fake.', 'i still have the original.'];

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  // the app behind the screenshot, then the post itself
  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#08080a');
  fill(ctx, CARD, PAPER);
  fill(ctx, { x: CARD.x, y: CARD.y, w: 0.004, h: CARD.h }, '#ff2e7e');

  // the one portrait the world draws rather than the interface
  place(ctx, 'face-cal', FACE);
  label(ctx, '@cal_hampton_77', ZONES.handle.x, ZONES.handle.y + ZONES.handle.h / 2, '#ff2e7e', 24, 'left');
  label(ctx, '2h', CARD.x + CARD.w - 0.022, ZONES.handle.y + ZONES.handle.h / 2, FAINT, 18, 'right');

  // what he wrote, on two lines the way it sits on a phone. Once the player has
  // put words in his mouth it is one line, because that is what they typed
  if (state.quote) {
    label(ctx, String(state.quote), ZONES.quote.x, 0.185, INK, 26, 'left', 0, ZONES.quote.w * 0.98);
  } else {
    label(ctx, SAID[0], ZONES.quote.x, 0.172, INK, 26, 'left', 0, ZONES.quote.w * 0.98);
    label(ctx, SAID[1], ZONES.quote.x, 0.212, INK, 26, 'left', 0, ZONES.quote.w * 0.98);
  }

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
    label(ctx, '2,214 replies', ZONES.proof.x, 0.685, FAINT, 17, 'left');
  } else {
    // an accusation with nothing under it
    fill(ctx, { x: ZONES.proof.x, y: 0.29, w: ZONES.proof.w, h: 0.002 }, '#c9ccd4');
    label(ctx, 'no attachment', ZONES.proof.x, 0.33, FAINT, 20, 'left');
    label(ctx, '2,214 replies', ZONES.proof.x, 0.38, FAINT, 17, 'left');
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

  /**
   * The one job where two familiar tools are both the wrong answer.
   *
   * A filter is wrong because nobody colour grades a screenshot, and there is a
   * tell for that. Crop is wrong for a harder reason: the attachment is most of
   * the frame, so cropping it away leaves a strip the engine cannot recognise as
   * having come from this picture at all — which is correct of it, and is also
   * exactly what a human would say about a screenshot cropped down to two lines.
   * Rather than promise a move that cannot work, the game says so.
   */
  nearMiss: (r) => {
    if (!r.trusted && !r.unreadable) {
      return 'thats not a screenshot any more, thats a strip of one. nobody is going to believe that';
    }
    return null;
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
      fix: 'Use BOARD UP and cover the attachment with a rectangle in the same near-white the card already is. A brush never matches a flat interface, and ERASE takes so much of the frame here that what is left stops reading as a screenshot.',
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
    'This is a screenshot of his post, not a photograph of a street. Two things make anybody believe a post and both have to go: the line he wrote, and the photo attached underneath it.',
    'Cover his line rather than typing on top of it, or you end up with two sentences stacked on each other. Click BOARD UP, draw a rectangle over the sentence saying the vantablack pic is fake, and set it to the same near-white the card already is. Then click REWRITE and type what you want him to have said on the blank space. When you post, the game will ask you what you typed.',
    'Now the photo underneath. Click BOARD UP again and cover it with a rectangle in that same near-white. Do not ERASE it, because the photo is most of the frame here and what is left stops looking like a screenshot at all. Do not PAINT it either, because a brush never matches flat colour. Then press POST IT.',
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
