/**
 * Level 8 — "The sign was red" (side work)
 *
 * The only job in the game whose answer is Hue, and the only one that could be.
 *
 * Hue is a single slider that turns every colour in the photograph by the same
 * amount, which normally makes it useless for lying: move a red car toward blue
 * and the sky goes with it. So the scene is one where that is not a problem. It
 * is night, and everything visible is lit by one neon sign, so every surface in
 * frame genuinely is that colour. Turning the whole photograph is turning the
 * one light in it, and the picture stays internally honest.
 *
 * Which makes the puzzle a question of *how far*. Rosalind's sign is red, the
 * one in this photograph is magenta, and an alibi turns on which of the two bars
 * was open. A short turn gets there. A long one sails past red, and the warm
 * tungsten lamps hanging inside the bar — the only things in the picture the
 * neon is not lighting — turn a colour a filament cannot produce.
 *
 * So: a window, not a threshold. Too little and it is still the wrong bar; too
 * much and he points at the lamps. That is the same shape as the marina job,
 * which is the best one in the run.
 *
 * It asked for a second flag at first — raise Vibrance so the sign reads as one
 * that was switched on — and that was cut rather than shipped. `colour` is a mean
 * saturation difference, and a long hue turn moves it as much as a real
 * saturation boost does, because CSS hue rotation is a fixed matrix rather than a
 * rotation in HSL and does not leave chroma alone. No threshold separated the
 * two. A requirement resting on a measurement that cannot tell the difference is
 * not a requirement, it is a coin toss.
 */

import { backdrop, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  /** the sign itself, which is the thing being recoloured */
  sign: { x: 0.2, y: 0.13, w: 0.41, h: 0.13 },
  /** wet asphalt taking the spill: the proof that the whole street is lit by it */
  street: { x: 0.06, y: 0.72, w: 0.88, h: 0.2 },
  /**
   * The pendant lamps inside the bar.
   *
   * The one part of the photograph the neon is not lighting. They are tungsten,
   * and tungsten is warm or it is broken.
   */
  lamps: { x: 0.24, y: 0.27, w: 0.26, h: 0.08 },
  /** the shopfront: crop it away and it is a wet street anywhere */
  front: { x: 0.13, y: 0.25, w: 0.5, h: 0.37 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-neon');

  // the world's version of the turn, done properly: the whole frame rotates,
  // because the whole frame is lit by the one sign
  if (state.neon === 'red') {
    ctx.save();
    ctx.globalCompositeOperation = 'hue';
    ctx.fillStyle = 'hsl(352, 100%, 50%)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  stamp(
    ctx,
    state.neon === 'red' ? "ROSALIND'S   01:30" : "THE MAGENTA ROOM   01:30",
    '#f0d8e4',
  );
}

export const level8: Level = {
  id: 8,
  title: 'The sign was red',
  client: 'j_ferreira',
  brief:
    "Two bars on that block. One has a red sign, one has a pink one, and I said I was at the red one. The photo says otherwise.",
  goal: 'Turn the night from one bar into the other.',
  teaches: 'Hue, on the one photograph where turning every colour at once is honest',
  teachesTool: 'filter',
  tools: ['crop', 'resize', 'filter', 'draw', 'shapes'],
  zones: ZONES,
  initial: { neon: 'magenta' },
  composite,

  flags: [
    {
      name: 'turned_red',
      chatter: [
        "rosalinds was heaving on saturday",
        'red sign, yeah. the pink one is two doors down',
        'i was in there. sounds about right',
      ],
      goal: 'Turn the neon from pink to red',
      /**
       * A window, measured on the road rather than the sign.
       *
       * The sign is close to blown out, and hue on a near-white pixel is noise.
       * The wet asphalt is the same light at a workable brightness, and it is
       * most of the frame.
       */
      test: (r) => r.zones.street.hueShift > 14 && r.zones.street.hueShift < 80,
      says: "It is Rosalind's in this photograph, and Rosalind's is where he says he was.",
    },
  ],
  required: ['turned_red'],

  keeps: [
    { zone: 'front', why: 'the shopfront is what says which bar this is' },
    { zone: 'street', why: 'the wet road is what proves the whole street was lit by that sign' },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('turned_red')) next.neon = 'red';
    return next;
  },

  solved: (s) => s.neon === 'red',

  /**
   * Overshooting earns nothing, so no tell would ever run on it.
   *
   * Which left the one failure the job is actually built around — turning the
   * slider too far — answered with "bro what did you even do". This says what
   * happened instead.
   */
  nearMiss: (r) => {
    const turn = r.zones.street.hueShift;
    if (turn >= 80) {
      return 'mate the lamps inside are green now. you have turned the whole street past red';
    }
    if (turn > 3) return 'thats barely moved. still the pink one';
    return null;
  },

  tells: [
    {
      id: 'still_pink',
      whole: true,
      // something was done to the colour, but not enough of it to change the bar
      test: (r) => r.zones.street.colour > 0.09 && r.zones.street.hueShift <= 14,
      zone: 'sign',
      post: 'thats still the pink one. brighter, but still the pink one.',
      fatal: false,
    },
  ],

  hints: [
    'Everything you can see is lit by that one sign, which is why turning all the colours at once is honest here and nowhere else in the game.',
    'Filter, then Hue. Pink to red is a small turn. Watch the wet road rather than the sign itself, because the sign is too bright to read a colour off.',
    'Do not drag it to the end. The lamps hanging inside the bar are ordinary bulbs, and they are the one thing that sign is not lighting. Go too far and they turn green, and that is the first place he looks.',
  ],

  reactions: [
    'that block has two bars and everyone mixes them up',
    'rosalinds or the magenta room, nobody can ever remember',
    'love this street when it rains',
    'the fire escape on that building is held on with hope',
  ],

  tolerance: 80,

  epilogue:
    "The sign is red, so he was at Rosalind's, so he was not where they said he was. Nobody walked down there to look.",
};
