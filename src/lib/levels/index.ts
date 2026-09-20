import type { Level } from '../level';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';
import { level8 } from './level8';

/**
 * The run, and the work you can take on the side.
 *
 * MAIN is the story: five jobs, one chapter each, and a man who starts as a
 * reply and finishes as the job. It is gated in order and it is the whole game
 * as far as the ending is concerned. Nothing was added to it to cover more of
 * the editor, because a story that grows to fit a feature list stops being one.
 *
 * SIDE is optional and always was. These are the jobs built around the parts of
 * the editor the run never needs — filter presets and grain, contrast and
 * sharpening and the aspect ratio nobody shoots by hand. Take them or do not;
 * the ending does not move either way. The only thing they change is what the
 * city is finally prepared to call you.
 */
export const MAIN: Level[] = [level1, level2, level3, level4, level5];

export const SIDE: Level[] = [level6, level7, level8];

/** Everything, for the test bench, which does not care what is optional. */
export const ALL: Level[] = [...MAIN, ...SIDE];
