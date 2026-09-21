/**
 * What each tool does to the world.
 *
 * The editor ships with a tool rail that says "Crop", "Resize", "Filter". That is
 * the truth about the software and a lie about the game: in POSTED, cropping is
 * not cropping, it is deciding that a man was never on that door. The library
 * lets the host app rename every control it shows and hand it a different icon,
 * so the rail reads as what the tool *means here* rather than what it is.
 *
 * This is the one place those names live. The editor's rail, the job checklist's
 * legend, the header and the chapter card all read from it, so a verb cannot say
 * one thing in the editor and another in the interface around it.
 *
 * Two constraints the runtime imposes, both measured rather than guessed:
 *
 *   The rail is a 72px column at 10px type, so a label over about eight
 *   characters is truncated with an ellipsis. `TIME AND LIGHT` became `LIGHT`
 *   for that reason and no other.
 *
 *   An icon is sanitised before it is rendered: the svg profile of DOMPurify
 *   drops scripts, styles, event attributes and external references, and the
 *   root tag's own width, height and style are stripped and replaced. So icons
 *   are plain geometry that inherits its colour, and nothing else.
 */

import type { ToolName } from './level';

export type Verb = {
  /** what the editor's own tool rail shows. Uppercase, eight characters or fewer */
  label: string;
  /** the same verb in a sentence: "he will see that you painted it" */
  verb: string;
  /** what it does to Leonida, for the rail legend and the chapter card */
  line: string;
  /** inline svg, 24px box, geometry only, coloured by whatever contains it */
  icon: string;
};

const icon = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter">${body}</svg>`;

export const VERBS: Record<ToolName, Verb> = {
  crop: {
    label: 'ERASE',
    verb: 'erase',
    line: 'whatever is at the edge is gone, and it was never there',
    icon: icon('<path d="M7 2v15h15"/><path d="M2 7h15v15"/>'),
  },
  resize: {
    label: 'COVER UP',
    verb: 'cover up',
    line: 'the frame goes back to the shape a camera makes',
    icon: icon('<path d="M3 3h12v12H3z"/><path d="M9 9h12v12H9z"/>'),
  },
  filter: {
    label: 'LIGHT',
    verb: 'change the light',
    line: 'the hour, the weather and the years all move together',
    icon: icon(
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    ),
  },
  draw: {
    label: 'PAINT',
    verb: 'paint',
    line: 'crude, and the edges never match what is around them',
    icon: icon('<path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14 6l4 4"/>'),
  },
  text: {
    label: 'REWRITE',
    verb: 'rewrite',
    line: 'the street prints whatever the sign now says',
    icon: icon('<path d="M4 6V4h16v2"/><path d="M12 4v16"/><path d="M8 20h8"/>'),
  },
  shapes: {
    label: 'BOARD UP',
    verb: 'board up',
    line: 'a colour that belongs covers a thing that does not',
    icon: icon('<path d="M3 3h9v9H3z"/><circle cx="15" cy="15" r="6"/>'),
  },
  stickers: {
    label: 'PLANT',
    verb: 'plant',
    line: 'an object is there, and it has been there all along',
    icon: icon('<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z"/>'),
  },
  frame: {
    label: 'OFFICIAL',
    verb: 'make it official',
    line: 'it claims a source, and the city believes the source',
    icon: icon('<path d="M2 2h20v20H2z"/><path d="M6 6h12v12H6z"/>'),
  },
};

/**
 * The keys the image editor actually renders, out of the union the library ships.
 *
 * Kept narrow on purpose: every key here is one somebody can see while playing,
 * and `content-check` asserts each still exists in the installed type definitions,
 * so a rename in a future runtime shows up as a failing check rather than as an
 * English word appearing in the middle of the fiction.
 */
export type EditorKey =
  | `image_editor.tools.${ToolName}`
  | 'image_editor.toolbar.save'
  | 'image_editor.toolbar.cancel'
  | 'image_editor.filters.noise'
  | 'image_editor.labels.drawing'
  | 'image_editor.labels.image'
  | 'image_editor.labels.shape'
  | 'image_editor.labels.sticker'
  | 'image_editor.labels.text';

export const EDITOR_TRANSLATIONS = {
  'image_editor.tools.crop': VERBS.crop.label,
  'image_editor.tools.resize': VERBS.resize.label,
  'image_editor.tools.filter': VERBS.filter.label,
  'image_editor.tools.draw': VERBS.draw.label,
  'image_editor.tools.text': VERBS.text.label,
  'image_editor.tools.shapes': VERBS.shapes.label,
  'image_editor.tools.stickers': VERBS.stickers.label,
  'image_editor.tools.frame': VERBS.frame.label,

  /** the editor's own commit is the game's POST IT, so it cannot be called Save */
  'image_editor.toolbar.save': 'POST IT',
  'image_editor.toolbar.cancel': 'UNDO ALL',

  /** the one filter the fiction has a better word for */
  'image_editor.filters.noise': 'GRAIN',

  // layer names, which appear the moment anything is placed on the photograph
  'image_editor.labels.drawing': 'PAINT',
  'image_editor.labels.image': 'PHOTO',
  'image_editor.labels.shape': 'BOARD',
  'image_editor.labels.sticker': 'PLANTED',
  'image_editor.labels.text': 'WRITING',
} satisfies Record<EditorKey, string>;

/**
 * The editor's own Cancel and Save, which the interface hides and the game presses.
 *
 * `globals.css` hides this group so the workspace has one commit button rather
 * than three, and `Game.postIt` reaches into it to press the real one. Two files
 * depending on the same positional selector is fragile, so they depend on this
 * constant instead and `content-check` asserts both still use it.
 */
export const SAVE_GROUP =
  '.editor-shell .image-editor-root > div > div:first-child > div:last-child';
