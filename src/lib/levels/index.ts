import type { Level } from '../level';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';

/**
 * Six jobs, fifteen to twenty minutes, then it ends. Not an endless mode.
 *
 * The order is the story's, not the file names'. Level 6 was written last but
 * plays fourth: by then he has said "same hand on all three", and this is the one
 * that makes him go public. The car park job has to stay where it is, because
 * that is where he stops being a commentator and becomes the job.
 */
export const LEVELS: Level[] = [level1, level2, level3, level6, level4, level5];
