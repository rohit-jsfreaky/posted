/**
 * Does the writing hold together?
 *
 * The bench checks the measurements. Nothing checked the words, and the words
 * are most of what a player actually experiences — so a line could appear twice
 * in the same job, a fatal tell could take your work away without saying what to
 * do instead, and a tell could point at a zone that no longer exists. All three
 * are silent: the game runs perfectly and just reads badly.
 *
 * This reads every level and fails loudly on any of it.
 *
 *     npm run check:content
 */

import { ALL, MAIN, SIDE } from '../src/lib/levels';
import { CHAPTERS, SIDE_BRIEFS } from '../src/lib/story';
import type { Level } from '../src/lib/level';

const problems: string[] = [];
const fail = (where: string, what: string) => problems.push(`${where}: ${what}`);

/**
 * Every line in the game, with where it came from, so a clash can be named.
 *
 * `spoken` marks the ones a person says out loud — chatter, replies, DMs, his
 * posts. Only those are compared for near-duplicates: a hint and a flag's own
 * summary are about the same thing on purpose and will always share words, and
 * flagging that is noise. An *exact* repeat is a bug wherever it is.
 */
const lines = new Map<string, { where: string[]; spoken: boolean }>();
function record(text: string, where: string, spoken = false) {
  const key = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const at = lines.get(key) ?? { where: [], spoken: false };
  at.where.push(where);
  at.spoken = at.spoken || spoken;
  lines.set(key, at);
}

/**
 * Near enough to read as the same line.
 *
 * "i drive past there every night, never seen a car sat like that" and "...never
 * seen a car parked like that anyway" are different strings and the same
 * sentence. Two people saying it in one thread is the thing that gets noticed.
 */
function similar(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 2));
  const wa = words(a);
  const wb = words(b);
  if (wa.size < 5 || wb.size < 5) return false;
  // a short line inside a long one shares all its words without being the same
  // line, so the two have to be roughly the same length to count
  const ratio = Math.min(wa.size, wb.size) / Math.max(wa.size, wb.size);
  if (ratio < 0.6) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.75;
}

function checkLevel(level: Level, kind: 'run' | 'side') {
  const at = `level ${level.id} (${level.title})`;
  const zones = new Set(Object.keys(level.zones));
  const flagNames = new Set(level.flags.map((f) => f.name));

  if (level.hints.length !== 3) {
    fail(at, `has ${level.hints.length} hints, expected 3`);
  }
  level.hints.forEach((h, i) => {
    if (!h.trim()) fail(at, `hint ${i + 1} is empty`);
    record(h, `${at} hint ${i + 1}`);
  });

  for (const f of level.flags) {
    const fat = `${at} flag ${f.name}`;
    if (f.chatter.length < 2) {
      fail(fat, `has ${f.chatter.length} chatter line(s) — a flag that fires alone repeats itself`);
    }
    /**
     * A system line is shown on its own whenever that flag is the only one to
     * fire, so it cannot open as though it is continuing a sentence.
     */
    if (/^(and|then|also|plus)\b/i.test(f.says.trim())) {
      fail(fat, `says line starts mid-sentence: "${f.says}"`);
    }
    /**
     * The crowd does not do forensics. That is the entire premise — "Nobody
     * checked. They never do." — and the man zooming in is the only one who
     * talks like this. A passer-by noticing a sensor's black point is the game
     * arguing with itself.
     */
    const forensic =
      /\b(sensor|pixel|halo|artefact|artifact|compression|aspect ratio|dimensions|1920|1080|metadata|exif|resolution|dpi)\b/i;
    for (const c of f.chatter) {
      if (forensic.test(c)) fail(fat, `a passer-by is doing forensics: "${c}"`);
    }
    if (!f.goal.trim()) fail(fat, 'has no goal line');
    if (!f.says.trim()) fail(fat, 'has no says line');
    record(f.goal, `${fat} goal`);
    record(f.says, `${fat} says`);
    f.chatter.forEach((c, i) => record(c, `${fat} chatter ${i + 1}`, true));
  }

  for (const name of level.required) {
    if (!flagNames.has(name)) fail(at, `requires "${name}", which is not one of its flags`);
  }

  for (const k of level.keeps) {
    if (!zones.has(k.zone)) fail(at, `keep points at zone "${k.zone}", which does not exist`);
    record(k.why, `${at} keep ${k.zone}`);
  }

  for (const t of level.tells) {
    const tat = `${at} tell ${t.id}`;
    if (!zones.has(t.zone)) fail(tat, `points at zone "${t.zone}", which does not exist`);
    if (!t.post.trim()) fail(tat, 'has no post');
    record(t.post, `${tat} post`, true);
    if (t.fatal) {
      if (!t.reverts) fail(tat, 'is fatal but reverts nothing');
      else if (!flagNames.has(t.reverts)) {
        fail(tat, `reverts "${t.reverts}", which is not one of this level's flags`);
      }
      if (!t.fix) {
        fail(tat, 'is fatal but has no fix — it takes work away without saying what to do instead');
      } else record(t.fix, `${tat} fix`);
    }
  }

  level.reactions.forEach((r, i) => record(r, `${at} reaction ${i + 1}`, true));

  if (level.choice && !flagNames.has(level.choice.when)) {
    fail(at, `choice fires on "${level.choice.when}", which is not one of its flags`);
  }

  // the story side
  const chapter = kind === 'run' ? CHAPTERS[MAIN.indexOf(level)] : SIDE_BRIEFS[level.id];
  if (!chapter) {
    fail(at, 'has no chapter or side brief');
    return;
  }
  if (chapter.dms.length === 0) fail(at, 'has a chapter with no DMs');
  if (chapter.payoff.length === 0) fail(at, 'has a chapter with no payoff');
  if (!chapter.himClosing.trim()) fail(at, 'has a chapter with no closing line from him');
  chapter.dms.forEach((m, i) => record(m.text, `${at} dm ${i + 1}`, true));
  chapter.payoff.forEach((m, i) => record(m.text, `${at} payoff ${i + 1}`, true));
  record(chapter.himClosing, `${at} his closing line`, true);
}

MAIN.forEach((l) => checkLevel(l, 'run'));
SIDE.forEach((l) => checkLevel(l, 'side'));

// ---------------------------------------------------------------- duplicates
for (const [text, at] of lines) {
  if (at.where.length > 1) {
    fail('said twice, word for word', `"${text}"\n     ${at.where.join('\n     ')}`);
  }
}

const spoken = [...lines.entries()].filter(([, at]) => at.spoken && at.where.length === 1);
for (let i = 0; i < spoken.length; i++) {
  for (let j = i + 1; j < spoken.length; j++) {
    if (!similar(spoken[i][0], spoken[j][0])) continue;
    fail(
      'two people saying the same thing',
      `"${spoken[i][0]}"\n     "${spoken[j][0]}"\n     ${spoken[i][1].where[0]}\n     ${spoken[j][1].where[0]}`,
    );
  }
}

if (problems.length === 0) {
  console.log(`clean: ${ALL.length} levels, ${lines.size} lines, nothing repeated`);
} else {
  console.log(`${problems.length} problem(s):\n`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}
