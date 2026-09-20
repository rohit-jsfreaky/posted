import type { Level } from '../level';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';

/**
 * Seven jobs, twenty minutes or so, then it ends. Not an endless mode.
 *
 * The order is the story's, not the file names'. Levels 6 and 7 were written
 * last and play fourth and fifth: by then he has said "same hand on all three",
 * and those two are where the thread he is building gets long enough for other
 * people to read. The car park job has to stay where it is, because that is where
 * he stops being a commentator and becomes the job.
 */
export const LEVELS: Level[] = [level1, level2, level3, level6, level7, level4, level5];
