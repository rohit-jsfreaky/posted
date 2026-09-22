/**
 * Level 6 — "This is from years ago"
 *
 * It sits fourth in the running order, between the marina and the car park. By
 * then he has said "same hand on all three"; this is the one that makes him go
 * public, and the lot job is where he becomes the target.
 *
 * Every other job changes what the photograph shows. This one changes *when* it
 * was taken, and it is the only job in the game whose answer lives in the filter
 * panel's top half — the presets. Nothing else in POSTED has ever needed one.
 *
 * It also settles a debt. Level 4 asked for Noise and could not have it: filters
 * reach the photo layer and never the object pasted on top of it, so graining a
 * pasted car is not a move this editor can make. Here the grain belongs on the
 * photograph itself, which is exactly what the Noise slider does reach, and it is
 * load-bearing: a black and white frame with no grain in it is a filter, and he
 * says so.
 *
 * The third leg is an old verb on purpose. The electric car at the right kerb is
 * the one thing in frame that could not have been there, and it sits at the edge
 * where crop can take it — the same move as Level 1, now being used for a reason
 * the player has to work out rather than one they were told.
 */

import { agePass, backdrop, label, place, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import { looksPainted } from '../suspicion';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  /**
   * The whole photograph, near enough.
   *
   * Colour and grain are properties of the print, not of one corner of it, so
   * both flags are measured over a single broad zone rather than somewhere
   * specific. The margin keeps the frame's own edges out of it.
   */
  plate: { x: 0.06, y: 0.08, w: 0.88, h: 0.84 },
  /** the car that cannot have been there. 2.007 keeps the cut-out unstretched */
  ev: { x: 0.752, y: 0.575, w: 0.231, h: 0.115 },
  sign: { x: 0.28, y: 0.255, w: 0.275, h: 0.11 },
  facade: { x: 0.09, y: 0.17, w: 0.6, h: 0.52 },
};

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-diner');

  if (state.ev) place(ctx, 'cut-ev', ZONES.ev);

  // the sign panel is blank in the art, so the game writes the name on it
  label(
    ctx,
    'THE FLAMINGO',
    ZONES.sign.x + ZONES.sign.w / 2,
    ZONES.sign.y + ZONES.sign.h / 2,
    '#3a3340',
    34,
    'center',
    0,
    ZONES.sign.w * 0.86,
  );

  // one pass over the finished day render, never a second painting
  if (state.era === 'old') agePass(ctx);

  stamp(
    ctx,
    state.era === 'old' ? 'OCEAN & 9TH   —' : 'OCEAN & 9TH   14:20',
    state.era === 'old' ? '#6b6153' : '#4a4450',
  );
}

export const level6: Level = {
  id: 6,
  title: 'This is from years ago',
  client: 'w_castellano',
  brief:
    'There is a photo of my place going round with a date on it. I need that date to be wrong by about thirty years.',
  goal: 'Make the photograph old enough to be useless.',
  teaches: 'Filter presets, and the grain that sells them',
  teachesTool: 'filter',
  tools: ['crop', 'resize', 'filter', 'draw', 'shapes'],
  ambience: 'day',
  zones: ZONES,
  initial: { era: 'now', ev: true },
  composite,

  flags: [
    {
      name: 'colour_gone',
      chatter: [
        'where did you even find this',
        'the flamingo looked so much better back then',
        'my mum used to eat there. thats the old front',
      ],
      goal: 'Take the colour out of it',
      // desaturating drops mean saturation across the whole print
      test: (r) => r.zones.plate.colour < -0.06,
      says: 'It reads like something out of a drawer.',
    },
    {
      name: 'grain_added',
      chatter: [
        'proper film grain on this one',
        'you can tell this is a scan',
      ],
      goal: 'Give it film grain',
      // an absolute noise floor, not a ratio: the print itself got grainier
      test: (r) => r.zones.plate.grain > 0.055,
      says: 'It has the grain of something that went through a lab.',
    },
    {
      name: 'ev_gone',
      chatter: [
        'no cars on ocean back then either',
        'that stretch was empty for years',
      ],
      goal: 'Lose the thing that could not be there',
      test: (r) => r.zones.ev.changed,
      says: 'Nothing left in it argues with the date.',
    },
  ],
  required: ['colour_gone', 'grain_added', 'ev_gone'],

  keeps: [
    { zone: 'sign', why: 'the name over the door is what says which place this is' },
    { zone: 'facade', why: 'crop the front away and it could be any diner anywhere' },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('colour_gone') && flags.includes('grain_added')) next.era = 'old';
    if (flags.includes('ev_gone')) next.ev = false;
    return next;
  },

  solved: (s) => s.era === 'old' && !s.ev,

  tells: [
    {
      /**
       * The reason Noise exists in this game.
       *
       * Colour gone and no grain is not an old photograph, it is a new one with a
       * preset on it, and that is the single most common way a fake period image
       * gives itself away.
       */
      id: 'no_grain',
      test: (r) => r.zones.plate.colour < -0.06 && r.zones.plate.grain <= 0.055,
      zone: 'plate',
      whole: true,
      post: 'thats not an old photo, thats a new one with a filter on it. theres no grain in it anywhere.',
      fatal: true,
      reverts: 'colour_gone',
      fix: 'Click LIGHT and drag GRAIN up after you take the colour out. Even 5 is enough. Film has grain and a filter on its own does not.',
    },
    {
      id: 'dated',
      test: (r, state) => Boolean(state.ev) && r.zones.plate.colour < -0.06,
      zone: 'ev',
      post: 'nothing in that photo is from then except the photo. zoom in on the kerb.',
      fatal: true,
      reverts: 'colour_gone',
      fix: 'The electric car at the right kerb could not have been there. It is at the edge, so click ERASE and drag the right edge of the frame in past it.',
    },
    {
      id: 'smeared_kerb',
      test: (r) => looksPainted(r.zones.ev),
      zone: 'ev',
      post: 'somebody has painted over the kerb. the line stops and starts again.',
      fatal: true,
      reverts: 'ev_gone',
      fix: 'The car sits at the right edge of the frame. Use ERASE and drag that edge in past it, instead of painting over it.',
    },
  ],

  hints: [
    'Make this photograph look about thirty years old, and get rid of the one thing in it that could not have been there: the electric car parked at the right kerb.',
    'Click LIGHT. At the top of that panel pick Grayscale or Sepia, or drag Saturation all the way down. Then drag GRAIN up, even as far as 5. Film has grain and a filter on its own does not, and he says so.',
    'Then click ERASE and drag the right edge of the frame leftwards past the electric car, so it ends up outside the picture. Keep the front of the diner and its sign in shot. Then press POST IT.',
  ],

  reactions: [
    'ocean and 9th has not looked like that in my lifetime',
    'the flamingo is still there you know',
    'they do a breakfast that would put you in hospital',
    'why is everyone posting old photos this week',
  ],

  tolerance: 75,

  epilogue:
    'The date on it is thirty years wrong and the replies are all nostalgia. Not one person asked.',
};
