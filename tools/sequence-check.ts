/**
 * Does every way a post can go still produce a sequence somebody can watch?
 *
 * The outcome of a post is now a list of steps computed before any of it plays
 * (src/lib/sequence.ts). That is a much better shape than fifteen timeouts, but
 * it moves the risk rather than removing it: a branch that produces no steps, or
 * a step with no duration, or an end state that disagrees with the steps that
 * were supposed to reach it, are all silent. The game would play a sequence that
 * skips a beat, or stops on a black screen, and nothing would throw.
 *
 * So every level is run through every outcome it can have — flipped, unreadable,
 * nothing landed, a KEEP destroyed, landed clean, landed and caught, landed and
 * caught fatally — and the shape of what comes back is asserted.
 *
 * The one rule worth stating on its own: whatever the player skips, the world
 * has to end up where watching it would have put it. That is the whole reason
 * `final` is computed up front, and it is checked here for every fatal tell in
 * the game, because a half-applied revert is the one failure that would leave
 * somebody playing a world that never existed.
 *
 *     npm run check:sequence
 */

import { ALL, MAIN } from '../src/lib/levels';
import { CHAPTERS, SIDE_BRIEFS } from '../src/lib/story';
import { judge, planPost, type Step, type Verdict } from '../src/lib/sequence';
import type { DiffReport, Reading } from '../src/lib/diff';
import type { Chapter } from '../src/lib/story';
import type { Level, WorldState } from '../src/lib/level';

const problems: string[] = [];
const fail = (where: string, what: string) => problems.push(`${where}: ${what}`);

/** the world as a string, so two renders can be compared without a canvas */
const render = (state: WorldState) => `r:${JSON.stringify(state)}`;
/** no shuffling: the same input has to give the same sequence every run */
const pick = <T,>(xs: T[], n: number): T[] => xs.slice(0, n);

const SOURCE = 'source-image';
const SENT = 'sent-image';

const chapterFor = (level: Level): Chapter =>
  MAIN.includes(level) ? CHAPTERS[MAIN.indexOf(level)] : SIDE_BRIEFS[level.id];

const flat: Reading = {
  missing: 0,
  structure: 0,
  residual: 0,
  drift: 0,
  detail: 1,
  colour: 0,
  hueShift: 0,
  edges: 1,
  grain: 0,
  bright: 0.5,
  changed: false,
};

/** enough of a report for `judge` to reach a verdict on */
function report(over: Partial<DiffReport> = {}): DiffReport {
  return {
    trusted: true,
    unreadable: false,
    alignment: { rotation: 0, mirrored: false, score: 1, coverage: 1, kx: 1, ky: 1, offX: 0, offY: 0 },
    gain: 1,
    photometry: { a: 1, b: 0, contrast: 0.2 },
    dims: { orig: [1200, 800], saved: [1200, 800], changed: false, aspectChanged: false },
    zones: {},
    ring: flat,
    ...over,
  };
}

/** what the world holds after a set of flags, the way the game builds it */
function worldAfter(level: Level, flags: string[], choice: string | null): WorldState {
  const w = level.apply(level.initial, flags);
  if (level.choice && choice) w[level.choice.key] = choice;
  return w;
}

const same = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * Every rule that holds no matter which way the post went.
 */
function checkShape(at: string, steps: Step[]) {
  if (steps.length === 0) {
    fail(at, 'produced no steps, so the stage would come up empty');
    return;
  }
  if (steps[0].kind !== 'print') {
    fail(at, `opens on "${steps[0].kind}" rather than the photograph`);
  }
  let total = 0;
  for (const [i, step] of steps.entries()) {
    if (!(step.ms > 0)) fail(at, `step ${i} ("${step.kind}") has no duration, so it would flash past`);
    if (step.ms > 6000) fail(at, `step ${i} ("${step.kind}") holds for ${step.ms}ms, which is a stall`);
    total += step.ms;
  }
  if (total < 2000) fail(at, `the whole sequence is ${total}ms, which is not a moment`);
  if (total > 26000) fail(at, `the whole sequence is ${total}ms, which is a cutscene`);

  // two people saying the same thing inside one post is the thing that gets noticed
  const said = new Map<string, number>();
  for (const step of steps) {
    for (const post of step.posts) {
      said.set(post.text, (said.get(post.text) ?? 0) + 1);
    }
  }
  for (const [text, n] of said) {
    if (n > 1) fail(at, `"${text}" appears ${n} times in one post`);
  }
}

function run(level: Level, name: string, verdict: Verdict, opts: { beat?: boolean; picked?: string | null } = {}) {
  const at = `level ${level.id} (${level.title}) — ${name}`;
  const picked = opts.picked ?? null;
  const seq = planPost({
    level,
    chapter: chapterFor(level),
    verdict,
    image: SENT,
    source: SOURCE,
    earned: [],
    choice: null,
    picked,
    beat: opts.beat ?? false,
    render,
    pick,
  });

  checkShape(at, seq.steps);
  const kinds = seq.steps.map((s) => s.kind);

  if (verdict.kind !== 'landed') {
    if (kinds.at(-1) !== 'nothing') {
      fail(at, `ends on "${kinds.at(-1)}" rather than telling the player nothing changed`);
    }
    if (seq.final.editorImage !== SOURCE) {
      fail(at, 'hands the editor something other than the photograph it started with');
    }
    if (!same(seq.final.earned, [])) fail(at, 'changed the world on a post that landed nothing');
    if (seq.landed) fail(at, 'reports as landed');
    return;
  }

  // ---------------------------------------------------------------- it landed
  const { hits, fatal, after, stuck } = verdict;
  // he digs on what the job has cost him in total, not on the last upload alone
  const wantsZoom = hits.length > 0 || verdict.heat > level.tolerance;
  const zoomAt = kinds.indexOf('zoom');
  if (wantsZoom && zoomAt === -1) fail(at, 'he had something to say and never said it');
  if (!wantsZoom && zoomAt !== -1) fail(at, 'he zoomed in on a post he had no reason to doubt');

  const zoom = seq.steps.find((s) => s.kind === 'zoom');
  if (zoom && zoom.kind === 'zoom' && zoom.zone) {
    const known = Object.values(level.zones).some(
      (z) => z.x === zoom.zone!.x && z.y === zoom.zone!.y && z.w === zoom.zone!.w,
    );
    if (!known) fail(at, 'he zooms into a rectangle that is not one of the level zones');
  }
  if (zoom && zoom.kind === 'zoom' && hits[0]?.whole && zoom.zone !== null) {
    fail(at, `tell "${hits[0].id}" is about the whole photograph but the stage zooms into a corner`);
  }

  const revertAt = kinds.indexOf('revert');
  if (fatal?.reverts) {
    if (revertAt === -1) fail(at, `tell "${fatal.id}" is fatal and nothing was taken back`);
    else if (zoomAt === -1 || revertAt < zoomAt) {
      fail(at, 'the street takes it back before he has said why');
    }
    const back = stuck.filter((f) => f !== fatal.reverts);
    if (!same(seq.final.earned, back)) {
      fail(at, `ends holding ${JSON.stringify(seq.final.earned)} rather than ${JSON.stringify(back)}`);
    }
    const held = level.choice && fatal.reverts === level.choice.when ? null : picked;
    if (seq.final.editorImage !== render(worldAfter(level, back, held))) {
      fail(at, 'hands the editor a photograph that is not the world it just reverted to');
    }
    /**
     * The rule the whole design rests on: skipping cannot land somewhere else.
     * Whatever the revert step applies has to be what the sequence ends on.
     */
    const step = seq.steps[revertAt];
    if (step?.kind === 'revert' && !same(step.apply.earned, seq.final.earned)) {
      fail(at, 'skipping past the revert would leave a different world than watching it');
    }
  } else if (revertAt !== -1) {
    fail(at, 'takes something back with no fatal tell to justify it');
  }

  const landed = level.solved(after) && !fatal;
  if (seq.landed !== landed) fail(at, `reports landed=${seq.landed} when the world says ${landed}`);
  if (landed) {
    if (seq.final.editorImage !== render(after)) {
      fail(at, 'hands the editor something other than the world the post produced');
    }
    if (!same(seq.final.earned, stuck)) fail(at, 'lost a flag it earned');
  }

  const wantsPayoff = landed && !(opts.beat ?? false);
  const clientAt = kinds.indexOf('client');
  const closingAt = kinds.indexOf('closing');
  if (wantsPayoff) {
    if (clientAt === -1) fail(at, 'the job landed and the client never replied');
    if (closingAt === -1) fail(at, 'the job landed and he never closed the chapter');
    if (clientAt > closingAt) fail(at, 'he closes the chapter before the client has answered');
    if (closingAt !== kinds.length - 1) fail(at, 'something happens after his closing line');
  } else {
    if (clientAt !== -1) fail(at, 'the client replied to a job that is not done');
    if (closingAt !== -1) fail(at, 'he closed a chapter that is not over');
  }
}

for (const level of ALL) {
  const solvedFlags = level.required;
  const picked = level.choice ? 'VCPD-7719042' : null;
  const after = worldAfter(level, solvedFlags, picked);
  const quiet = { total: 0, notes: [] };

  run(level, 'flipped', { kind: 'mirrored' });
  run(level, 'unreadable', { kind: 'untrusted', unreadable: true });
  run(level, 'not a photograph', { kind: 'untrusted', unreadable: false });
  run(level, 'nothing landed', { kind: 'nothing', missed: null });
  run(level, 'a near miss', { kind: 'nothing', missed: 'thats barely moved' });
  run(level, 'a keep destroyed', { kind: 'keeps', broken: [level.keeps[0]] });

  const landed = (over: Partial<Extract<Verdict, { kind: 'landed' }>> = {}) =>
    ({
      kind: 'landed' as const,
      smell: quiet,
      heat: 0,
      hits: [],
      fatal: null,
      after,
      stuck: solvedFlags,
      flags: solvedFlags,
      ...over,
    });

  run(level, 'landed clean', landed(), { picked });
  run(level, 'landed, already paid', landed(), { picked, beat: true });
  run(
    level,
    'landed, and he smells it',
    landed({
      heat: level.tolerance + 1,
      smell: {
        total: level.tolerance + 1,
        notes: [
          {
            zone: Object.keys(level.zones)[0],
            method: 'painted',
            cost: 34,
            note: 'the edges in this do not match anything around them',
          },
        ],
      },
    }),
    { picked },
  );
  /**
   * The exploit this was built to close.
   *
   * Three careful little posts used to be strictly cheaper than one honest one,
   * because only the newest was ever measured. A post that looks clean on its
   * own still has to set him off once the job as a whole has cost too much.
   */
  run(
    level,
    'landed clean, but the job has cost too much by now',
    landed({
      heat: level.tolerance + 1,
      smell: {
        total: 4,
        notes: [
          {
            zone: Object.keys(level.zones)[0],
            method: 'dimmed',
            cost: 4,
            note: 'the light in this is not the light that was there',
          },
        ],
      },
    }),
    { picked },
  );

  // every tell in the game, on the post it is written for
  for (const tell of level.tells) {
    run(
      level,
      `caught by "${tell.id}"`,
      landed({ hits: [tell], fatal: tell.fatal ? tell : null }),
      { picked },
    );
  }
}

/**
 * The verdict itself, on reports rather than on fabricated outcomes.
 *
 * `planPost` above is fed verdicts directly, which is what makes it possible to
 * reach every branch — but then nothing would check that a flipped photograph
 * actually produces the flipped verdict. These are the three that are cheap to
 * build from a report and expensive to get wrong.
 */
{
  const level = MAIN[0];
  const ctx = { earned: [], choice: null, picked: null };

  const mirrored = judge(level, report({ alignment: { ...report().alignment, mirrored: true } }), ['night'], ctx);
  if (mirrored.kind !== 'mirrored') fail('judge', 'a flipped photograph is not read as flipped');

  const dark = judge(level, report({ trusted: false, unreadable: true }), [], ctx);
  if (dark.kind !== 'untrusted') fail('judge', 'an unreadable photograph is not read as untrusted');

  const idle = judge(level, report(), [], ctx);
  if (idle.kind !== 'nothing') fail('judge', 'a post that earned nothing is not read as nothing');
}

const outcomes = ALL.reduce((n, l) => n + 10 + l.tells.length, 0);
if (problems.length === 0) {
  console.log(`clean: ${ALL.length} levels, ${outcomes} outcomes, every one of them watchable`);
} else {
  console.log(`${problems.length} problem(s):\n`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}
