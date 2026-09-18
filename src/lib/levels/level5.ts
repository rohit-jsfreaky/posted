/**
 * Level 5 — "Make it official"
 *
 * Every level so far taught the same thing: hide what you did. This one turns that
 * over. An official photo *is* framed, *is* labelled, and *is* redacted — here the
 * black bar is not suspicious, its absence is.
 *
 * The case number is the catch. The game never reads the player's typed text (the
 * editor's API cannot expose it), so it detects that the label changed and then
 * asks which number was written. The right one is in the photo already, printed on
 * the folder, if you bother to count the digits.
 */

import { fill, label, person, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  face: { x: 0.3, y: 0.26, w: 0.13, h: 0.17 },
  label: { x: 0.06, y: 0.84, w: 0.34, h: 0.09 },
  folder: { x: 0.58, y: 0.6, w: 0.26, h: 0.14 },
  room: { x: 0.0, y: 0.0, w: 1.0, h: 0.6 },
};

export const REFERENCE_CASE = 'VCPD-7719042';

export const CASE_OPTIONS = ['VCPD-884213', 'VCPD-8842137', 'VCPD-88421'];

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);

  // a flat, clinical interior
  fill(ctx, { x: 0, y: 0, w: 1, h: 1 }, '#b7b9b4');
  fill(ctx, { x: 0, y: 0, w: 1, h: 0.58 }, '#c2c4bf');
  fill(ctx, { x: 0, y: 0.58, w: 1, h: 0.42 }, '#9b9d99');

  // wall panels, a blind and a clock. An empty room is almost featureless, and
  // the alignment search needs edges in both directions to hold on to
  for (let i = 0; i < 7; i++) {
    fill(ctx, { x: 0.02 + i * 0.14, y: 0.04, w: 0.002, h: 0.52 }, '#adafaa');
  }
  fill(ctx, { x: 0, y: 0.5, w: 1, h: 0.004 }, '#a8aaa5');
  fill(ctx, { x: 0.62, y: 0.08, w: 0.3, h: 0.22 }, '#cfd1cc');
  for (let i = 0; i < 8; i++) {
    fill(ctx, { x: 0.62, y: 0.09 + i * 0.026, w: 0.3, h: 0.012 }, '#b9bcb7');
  }
  // a dark doorway and a dark chair back: this room was all mid greys, and a
  // scene with no contrast range is a scene the alignment search cannot read
  fill(ctx, { x: 0.86, y: 0.32, w: 0.12, h: 0.26 }, '#4b4e52');
  fill(ctx, { x: 0.875, y: 0.34, w: 0.09, h: 0.22 }, '#33363a');
  fill(ctx, { x: 0.2, y: 0.46, w: 0.06, h: 0.12 }, '#5c5f63');
  fill(ctx, { x: 0.06, y: 0.1, w: 0.09, h: 0.09 }, '#d5d7d2');
  fill(ctx, { x: 0.1, y: 0.115, w: 0.004, h: 0.035 }, '#3b3e42');
  fill(ctx, { x: 0.1, y: 0.145, w: 0.028, h: 0.004 }, '#3b3e42');

  // table
  fill(ctx, { x: 0.04, y: 0.56, w: 0.92, h: 0.04 }, '#8a8c88');
  fill(ctx, { x: 0.04, y: 0.6, w: 0.92, h: 0.012 }, '#767872');
  fill(ctx, { x: 0.12, y: 0.61, w: 0.03, h: 0.2 }, '#7c7e79');
  fill(ctx, { x: 0.85, y: 0.61, w: 0.03, h: 0.2 }, '#7c7e79');
  fill(ctx, { x: 0, y: 0.8, w: 1, h: 0.006 }, '#8e908c');

  // the witness behind the table
  person(ctx, { x: 0.28, y: 0.24, w: 0.17, h: 0.34 }, '#7e817c');
  if (state.face === 'visible') {
    fill(ctx, ZONES.face, '#cbb9a6');
    fill(ctx, { x: 0.335, y: 0.31, w: 0.02, h: 0.018 }, '#4a4038');
    fill(ctx, { x: 0.385, y: 0.31, w: 0.02, h: 0.018 }, '#4a4038');
    fill(ctx, { x: 0.345, y: 0.37, w: 0.05, h: 0.012 }, '#6b5a4a');
  } else {
    fill(ctx, ZONES.face, '#14161a');
  }

  // the folder on the table, with a real case number printed on it
  fill(ctx, ZONES.folder, '#d8d3c4');
  fill(ctx, { x: 0.58, y: 0.6, w: 0.26, h: 0.025 }, '#c2bcaa');
  label(ctx, REFERENCE_CASE, 0.71, 0.66, '#33363a', 22);
  label(ctx, 'FILED', 0.71, 0.705, '#6d6f6a', 16);

  // the label strip along the bottom
  fill(ctx, ZONES.label, state.official ? '#e7e4da' : '#a5a7a2');
  if (state.case_no) {
    label(ctx, String(state.case_no), 0.23, 0.885, '#24272b', 26);
  } else {
    label(ctx, 'NO CASE NUMBER', 0.23, 0.885, '#6f716d', 20);
  }

  if (state.official) {
    // the border that makes a photograph a document
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.strokeStyle = '#1d2024';
    ctx.lineWidth = Math.round(W * 0.022);
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      W - ctx.lineWidth,
      H - ctx.lineWidth,
    );
    label(ctx, 'EVIDENCE — VICE CITY PD', 0.5, 0.965, '#e7e4da', 20);
  }

  stamp(ctx, 'INTERVIEW ROOM 2   11:05', '#4b4e52');
}

export const level5: Level = {
  id: 5,
  title: 'Make it official',
  client: 'no name given',
  brief:
    'I need this to look like it came from a police archive, not a phone. Frame it, label it, and cover the witness. Get the case number right.',
  goal: 'Change not what the photo shows, but where it claims to be from.',
  teaches: 'Text, Shapes and Frame — claiming a source instead of changing a fact',
  tools: ['crop', 'resize', 'filter', 'draw', 'stickers', 'shapes', 'text', 'frame'],
  zones: ZONES,
  initial: { official: false, face: 'visible', case_no: '' },
  composite,

  flags: [
    {
      name: 'official',
      test: (r) => r.ring.changed,
      says: 'It reads like a document now, not a snapshot.',
    },
    {
      name: 'face_hidden',
      // A bar over the eyes is the classic redaction precisely because covering
      // a third of a face defeats recognition. Note a black bar *raises* local
      // contrast rather than collapsing it, so the variance test alone (which
      // describes blur and pixelate) would never see one.
      test: (r) =>
        r.zones.face.detail < 0.45 ||
        r.zones.face.structure > 0.3 ||
        r.zones.face.bright < 0.18,
      says: 'The witness is redacted, the way a real file would redact them.',
    },
    {
      name: 'case_numbered',
      test: (r) => r.zones.label.changed,
      says: 'It carries a case number.',
    },
  ],
  required: ['official', 'face_hidden', 'case_numbered'],

  keeps: [
    { zone: 'folder', why: 'the folder on the table is what dates the file' },
    { zone: 'room', why: 'crop the room away and it stops looking like an interview' },
  ],

  // when the label changes, the game cannot read the typed text, so it asks
  choice: {
    when: 'case_numbered',
    prompt: 'What did you write on the label?',
    options: CASE_OPTIONS,
    key: 'case_no',
  },

  apply(state, flags) {
    const next = { ...state };
    if (flags.includes('official')) next.official = true;
    if (flags.includes('face_hidden')) next.face = 'redacted';
    return next;
  },

  solved: (s) => Boolean(s.official) && s.face === 'redacted' && Boolean(s.case_no),

  tells: [
    {
      id: 'digits',
      test: (_r, state) => {
        const digits = String(state.case_no ?? '').replace(/\D/g, '').length;
        return Boolean(state.case_no) && digits !== 7;
      },
      zone: 'label',
      post: 'VCPD case numbers have seven digits. that one has six. the folder in the same photo has seven.',
      fatal: true,
      reverts: 'case_numbered',
    },
    {
      id: 'no_redaction',
      test: (r) =>
        r.ring.changed &&
        !(
          r.zones.face.detail < 0.45 ||
          r.zones.face.structure > 0.3 ||
          r.zones.face.bright < 0.18
        ),
      zone: 'face',
      post: 'a real evidence photo would have that face blacked out. this one does not.',
      fatal: false,
    },
  ],

  reactions: [
    'where did this come from',
    'thats the interview room at the 8th, i recognise the table',
    'if its evidence why is it on here',
    'case number checks out',
  ],

  tolerance: 95,
  epilogue: 'He was right about all of it.',
};
