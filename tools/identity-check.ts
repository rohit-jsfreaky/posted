/**
 * Does any flag or tell fire on a photograph nobody touched?
 *
 * A flag that passes on the untouched photo is free money: post without editing
 * and the world moves anyway. A tell that fires on it accuses the player of
 * forging something they did not do. Both are silent — the game still runs — so
 * this walks every level and asks the question directly.
 */
import { LEVELS } from '../src/lib/levels';
import type { DiffReport, Reading } from '../src/lib/diff';

const same: Reading = {
  missing: 0,
  structure: 0,
  residual: 0,
  drift: 0,
  detail: 1,
  colour: 0,
  grain: 1,
  bright: 0.5,
  changed: false,
};

function untouched(zones: string[]): DiffReport {
  return {
    trusted: true,
    unreadable: false,
    alignment: { rotation: 0, mirrored: false, score: 1, coverage: 1, kx: 1, ky: 1, offX: 0, offY: 0 },
    gain: 1,
    photometry: { a: 1, b: 0, contrast: 1 },
    dims: { orig: [1200, 800], saved: [1200, 800], changed: false, aspectChanged: false },
    zones: Object.fromEntries(zones.map((z) => [z, { ...same }])),
    ring: { ...same },
  };
}

let bad = 0;
for (const level of LEVELS) {
  const r = untouched(Object.keys(level.zones));
  const flags = level.flags.filter((f) => f.test(r)).map((f) => f.name);
  const tells = level.tells.filter((t) => t.test(r, level.initial)).map((t) => t.id);
  if (flags.length || tells.length) {
    bad++;
    console.log(`LEVEL ${level.id}  ${level.title}`);
    if (flags.length) console.log(`  flags fire on an untouched photo: ${flags.join(', ')}`);
    if (tells.length) console.log(`  tells fire on an untouched photo: ${tells.join(', ')}`);
  }
}
console.log(bad === 0 ? 'clean: nothing fires on an untouched photo' : `${bad} level(s) affected`);
