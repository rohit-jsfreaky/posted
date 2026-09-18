/**
 * What a level is.
 *
 * A level owns its world state, how that state is drawn, which measurements count
 * as flags, what must survive, and what the antagonist looks for. The engine in
 * diff.ts knows none of this — it only measures.
 */

import type { DiffReport } from './diff';
import { SCENE_H, SCENE_W, type Ctx } from './draw';
import type { ZoneMap } from './zones';

export type WorldState = Record<string, string | boolean>;

/** The editor tools a level hands the player. `draw` is always there, and always crude. */
export type ToolName =
  | 'crop'
  | 'resize'
  | 'filter'
  | 'draw'
  | 'text'
  | 'shapes'
  | 'stickers'
  | 'frame';

export const ALL_TOOLS: ToolName[] = [
  'crop',
  'resize',
  'filter',
  'draw',
  'text',
  'shapes',
  'stickers',
  'frame',
];

export type FlagSpec = {
  name: string;
  /** reads the measurements and decides whether the player claimed this */
  test: (r: DiffReport) => boolean;
  /** what the street does about it, in plain words */
  says: string;
  /**
   * What the player still has to achieve, phrased as the thing not the mechanism.
   * Shown on the job checklist — without it a player who does half the job has no
   * way of knowing which half is missing.
   */
  goal: string;
  /**
   * What the street says about *this* change specifically.
   *
   * Reactions used to be a level-wide pool, which meant somebody could remove a
   * bouncer and get three replies about how busy the queue was last night. People
   * comment on what they can see, so the lines belong to the flag that caused them.
   */
  chatter: string[];
};

export type Keep = {
  zone: string;
  /** why nobody believes the post without it */
  why: string;
};

export type Tell = {
  id: string;
  /** what makes him spot it */
  test: (r: DiffReport, state: WorldState) => boolean;
  /** the zone the camera pushes into */
  zone: string;
  /**
   * Some tells are about the whole photograph rather than a place in it — its
   * shape, its dimensions. Zooming into a corner of the wall to make a point about
   * the frame is nonsense, so these show the picture entire instead.
   */
  whole?: boolean;
  post: string;
  /** a fatal tell reverts one of your flags. a soft one is just a warning */
  fatal: boolean;
  reverts?: string;
  /**
   * What would have worked instead, in one sentence.
   *
   * A fatal tell takes back work the player already did. Without a reason the
   * street simply undoes itself and the player learns nothing except that the
   * game is unfair, so every tell that reverts something says what to do instead.
   */
  fix?: string;
};

export type Level = {
  id: number;
  title: string;
  client: string;
  brief: string;
  goal: string;
  /** the one new tool this level is about */
  teaches: string;
  tools: ToolName[];
  zones: ZoneMap;
  initial: WorldState;
  composite: (state: WorldState, ctx: Ctx) => void;
  flags: FlagSpec[];
  required: string[];
  keeps: Keep[];
  apply: (state: WorldState, flags: string[]) => WorldState;
  solved: (state: WorldState) => boolean;
  tells: Tell[];
  /**
   * Asked for, never pushed.
   *
   * Knowing which manipulation solves a problem is the game, so nothing is shown
   * until the player asks. They come in order, widest first: what has to change,
   * then which tool reaches it, then the exact move. Somebody who has worked it
   * out never sees one; somebody stuck never has to guess twice.
   */
  hints: string[];
  /**
   * Some things cannot be measured, only asked.
   *
   * The editor hands back pixels, not text, so when the player writes on
   * something the game cannot read what it says. It asks them to type it again.
   * Offering a few authored strings to pick from was worse than asking: somebody
   * who had just written their own number was shown a list of three numbers that
   * were not it. What they type is what the world prints.
   */
  choice?: {
    when: string;
    prompt: string;
    /** greyed-out example in the box, never submitted */
    placeholder: string;
    /** the label in the photograph is small; anything longer will not fit on it */
    maxLength: number;
    key: string;
  };
  /** what the street says when the post lands and holds up */
  reactions: string[];
  /** how much suspicion this job tolerates before he starts digging */
  tolerance: number;
  /** shown after the job is done, going into the next one */
  epilogue: string;
};

/** Which flags fired, and what each one did to the world. */
export function readFlags(level: Level, report: DiffReport): string[] {
  if (!report.trusted) return [];
  return level.flags.filter((f) => f.test(report)).map((f) => f.name);
}

/** Which tells he spotted, worst first. */
export function spotted(level: Level, report: DiffReport, state: WorldState): Tell[] {
  if (!report.trusted) return [];
  const hits = level.tells.filter((t) => t.test(report, state));
  return hits.sort((a, b) => Number(b.fatal) - Number(a.fatal));
}

/** A KEEP is broken when the thing that proves the photo is real got destroyed. */
export function brokenKeeps(level: Level, report: DiffReport): Keep[] {
  if (!report.trusted) return [];
  return level.keeps.filter((k) => {
    const z = report.zones[k.zone];
    if (!z) return false;
    return z.missing > 0.45 || z.structure > 0.45;
  });
}

/** Draw a level's world to a PNG data URL. Client only — it needs a canvas. */
export function renderLevel(level: Level, state: WorldState): string {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context not available');
  level.composite(state, ctx);
  return canvas.toDataURL('image/png');
}

/** The editor's tool config for a level: everything it teaches, nothing it does not. */
export function toolConfig(level: Level) {
  const tools: Record<string, boolean> = {};
  for (const t of ALL_TOOLS) tools[t] = level.tools.includes(t);
  return { features: { imageEditor: { tools } } };
}
