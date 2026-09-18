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
  post: string;
  /** a fatal tell reverts one of your flags. a soft one is just a warning */
  fatal: boolean;
  reverts?: string;
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
   * Some things cannot be measured, only asked. The editor's API cannot tell us
   * what text the player typed, so when a flag fires the level may ask them
   * which of a few authored strings they wrote.
   */
  choice?: {
    when: string;
    prompt: string;
    options: string[];
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
