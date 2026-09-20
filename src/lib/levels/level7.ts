/**
 * Level 7 — "Off the gantry camera"
 *
 * Plays fifth. The one before it made a photograph older than it was; this one
 * changes what took it.
 *
 * A phone photo of a van at a loading dock proves nothing, because anybody could
 * have been standing there holding it. The same frame off a fixed camera with a
 * number on it is evidence: it has a place, a time and an owner. Nothing in the
 * picture has to change at all. What has to change is the fingerprint the device
 * leaves on it.
 *
 * This is the job the rest of the filter panel was waiting for:
 *
 *   Contrast   cheap sensors crush the blacks instead of rolling them off
 *   Sharpen    and then oversharpen everything to make up for the lens
 *   Crop 4:3   fixed cameras do not shoot 3:2, they shoot 4:3, and he knows it
 *
 * Three sliders and an aspect ratio, none of which any other job touches, and
 * all three are separable in the measurements: contrast shows up in the
 * photometric fit's gain, sharpening shows up in detail *after* that gain has
 * been divided out, and the ratio is just arithmetic on the saved dimensions.
 */

import { backdrop, cameraPass, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  /** the whole print: tone and sharpening are properties of it, not of a corner */
  plate: { x: 0.06, y: 0.08, w: 0.88, h: 0.84 },
  /** the van is the only thing the photograph is actually about */
  van: { x: 0.31, y: 0.41, w: 0.33, h: 0.19 },
  /** the shutter and the platform: lose these and it is a van in a car park */
  dock: { x: 0.22, y: 0.19, w: 0.58, h: 0.5 },
};

/** What a fixed camera writes in the corner, once the photo claims to be one. */
const CAM_ID = 'CAM 04  LOADING  13:52';

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-dock');

  if (state.source === 'camera') cameraPass(ctx);

  stamp(
    ctx,
    state.source === 'camera' ? CAM_ID : 'BACK OF DELANCEY   13:52',
    state.source === 'camera' ? '#d8dde3' : '#3d4149',
  );
}

export const level7: Level = {
  id: 7,
  title: 'Off the gantry camera',
  client: 'r_okafor',
  brief:
    "Nobody cares about a photo somebody took on their phone. I need this one to have come off camera four, and I need it to look like it.",
  goal: 'Change not what took the photograph, but what it claims took it.',
  teaches: 'Contrast, Sharpen, and the aspect ratio nobody shoots by hand',
  tools: ['crop', 'resize', 'filter', 'draw', 'shapes'],
  zones: ZONES,
  initial: { source: 'phone' },
  composite,

  flags: [
    {
      name: 'ratio_fixed',
      chatter: [
        'thats the yard camera, i recognise the angle',
        'delancey have had that camera up for years',
      ],
      goal: 'Give it the shape a fixed camera shoots',
      /**
       * Four by three, within a hair.
       *
       * The editor has it as a preset in the crop panel, which is the point —
       * this is the only job that needs the half of that panel nothing else does.
       */
      test: (r) => Math.abs(r.dims.saved[0] / r.dims.saved[1] - 4 / 3) < 0.035,
      says: 'It is the shape everything off that camera is.',
    },
    {
      name: 'tone_crushed',
      chatter: [
        'so this is off their camera then, not somebodys phone',
        'security footage always looks this grim',
      ],
      goal: 'Crush it like a cheap sensor',
      // contrast scales the whole photo, which is exactly what the linear fit's
      // gain measures
      test: (r) => r.photometry.a > 1.18,
      says: 'The blacks are crushed the way that camera crushes them.',
    },
    {
      name: 'oversharpened',
      chatter: [
        'you can actually tell what you are looking at for once',
        'if its off the yard system then it happened, simple as',
      ],
      goal: 'Oversharpen it the way they do',
      /**
       * Harder edges than the original had.
       *
       * Not `detail`, which is a standard deviation and describes contrast
       * across the zone rather than sharpness — push the contrast slider and it
       * moves, run an unsharp mask and it barely does. `edges` reads the top of
       * the high-frequency distribution against the original's, which is the
       * thing sharpening actually changes.
       */
      test: (r) => r.zones.plate.edges > 1.2,
      says: 'It carries the halo their processing leaves on everything.',
    },
  ],
  required: ['ratio_fixed', 'tone_crushed', 'oversharpened'],

  keeps: [
    { zone: 'van', why: 'the van is the only thing this photograph is about' },
    { zone: 'dock', why: 'lose the shutter and the platform and it is a van in a car park' },
  ],

  apply(state, flags) {
    const next = { ...state };
    if (
      flags.includes('ratio_fixed') &&
      flags.includes('tone_crushed') &&
      flags.includes('oversharpened')
    ) {
      next.source = 'camera';
    }
    return next;
  },

  solved: (s) => s.source === 'camera',

  tells: [
    {
      id: 'wrong_ratio',
      whole: true,
      test: (r) =>
        r.photometry.a > 1.18 &&
        Math.abs(r.dims.saved[0] / r.dims.saved[1] - 4 / 3) >= 0.035,
      zone: 'plate',
      post: 'camera four shoots 4:3 like every other camera on that yard. that is not 4:3.',
      fatal: true,
      reverts: 'tone_crushed',
      fix: 'Crop, and take the 4:3 preset rather than dragging the corners by eye.',
    },
    {
      id: 'too_smooth',
      test: (r) => r.photometry.a > 1.18 && r.zones.plate.edges <= 1.2,
      zone: 'van',
      post: 'nothing off that camera is that smooth. they oversharpen everything, look at any other still.',
      fatal: true,
      reverts: 'tone_crushed',
      fix: 'Filter > Sharpen, up. Their processing leaves a halo on every edge and yours has none.',
    },
  ],

  hints: [
    'Nothing in this picture has to change. What took it does.',
    'A cheap fixed camera leaves three marks. It crushes the dark parts, so push Contrast up hard. It over-sharpens to cover a bad lens, so push Sharpen up too. And it shoots 4:3, which is not the shape a phone hands you.',
    'For the shape, open Crop and click the 4:3 button rather than dragging the corners about. Keep the van and the shutter in frame or the photograph stops being about anything.',
  ],

  reactions: [
    'delancey never let anyone see that footage',
    'who even has access to camera four',
    'that yard is on three cameras, not one',
    'this is the third weird photo this week',
  ],

  tolerance: 80,

  epilogue:
    'It is a still off camera four now, and a still off camera four is evidence. He has noticed the thread is getting long.',
};
