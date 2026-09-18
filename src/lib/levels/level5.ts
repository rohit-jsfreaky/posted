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

import { backdrop, fill, label, place, reset, stamp, type Ctx } from '../draw';
import type { Level, WorldState } from '../level';
import type { ZoneMap } from '../zones';

const ZONES: ZoneMap = {
  face: { x: 0.45, y: 0.28, w: 0.12, h: 0.15 },
  label: { x: 0.06, y: 0.86, w: 0.34, h: 0.09 },
  folder: { x: 0.66, y: 0.65, w: 0.24, h: 0.12 },
  room: { x: 0.0, y: 0.0, w: 1.0, h: 0.62 },
};

/** The seated witness, sized so their head lands in the face zone. */
const SEAT = { x: 0.38, y: 0.26, w: 0.26, h: 0.35 };

/** The blank white sticker already printed on the folder in the art. */
const FOLDER_LABEL = { x: 0.71, y: 0.665, w: 0.14, h: 0.05 };

export const REFERENCE_CASE = 'VCPD-7719042';

export const CASE_OPTIONS = ['VCPD-884213', 'VCPD-8842137', 'VCPD-88421'];

function composite(state: WorldState, ctx: Ctx) {
  reset(ctx);
  backdrop(ctx, 'bg-archive');

  place(ctx, 'cut-witness', SEAT);
  if (state.face !== 'visible') fill(ctx, ZONES.face, '#14161a');

  // the folder's label is blank in the art, so the game prints the real case
  // number on it. This is the number the player is meant to count the digits of
  label(
    ctx,
    REFERENCE_CASE,
    FOLDER_LABEL.x + FOLDER_LABEL.w / 2,
    FOLDER_LABEL.y + FOLDER_LABEL.h / 2,
    '#33363a',
    22,
  );

  // the caption strip along the bottom, which only exists once it is claimed
  fill(ctx, ZONES.label, state.official ? '#e7e4da' : '#7c7f7a');
  label(
    ctx,
    state.case_no ? String(state.case_no) : 'NO CASE NUMBER',
    ZONES.label.x + ZONES.label.w / 2,
    ZONES.label.y + ZONES.label.h / 2,
    state.case_no ? '#24272b' : '#c8ccc6',
    state.case_no ? 30 : 24,
  );

  if (state.official) {
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
    label(ctx, 'EVIDENCE - VICE CITY PD', 0.5, 0.968, '#e7e4da', 20);
  }

  stamp(ctx, 'INTERVIEW ROOM 2   11:05', '#e8e2d2');
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
      chatter: [
        'where did this even come from',
        'thats an evidence photo, why is it on here',
      ],
      goal: 'Make it look like a file',
      test: (r) => r.ring.changed,
      says: 'It reads like a document now, not a snapshot.',
    },
    {
      name: 'face_hidden',
      chatter: [
        'face is blacked out like a real file',
      ],
      goal: 'Cover the witness',
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
      chatter: [
        'case number checks out',
      ],
      goal: 'Put a case number on it',
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

  hints: [
    'Nothing in this photo has to change. Where it claims to have come from does.',
    'Frame gives it the border of a filed document. For the witness, Blur or Pixelate her face, or lay a black bar across it the way a real file would.',
    'Text writes the case number on the label. It will ask you what you wrote — VCPD numbers are seven digits long, and the folder on the table has one you can count.',
  ],
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
      fix: 'Write a case number with seven digits, the way the folder in the same photo does.',
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
