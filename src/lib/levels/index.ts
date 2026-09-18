import type { Level } from '../level';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';

/** Five levels, ten to fifteen minutes, then it ends. Not an endless mode. */
export const LEVELS: Level[] = [level1, level2, level3, level4, level5];
