/**
 * What happens when you press POST IT, as data.
 *
 * The outcome of a post used to be fifteen timeouts scattered through the game
 * component, firing into four different parts of the screen: a thumbnail
 * dissolving inside a rail tab, a toast over the workspace, replies arriving in
 * a panel that might not be open, and two full-screen overlays. The best moment
 * in the game — a scruffy edit going in and a clean city coming back — was 380
 * pixels wide and only visible if you happened to be on the right tab.
 *
 * So the outcome is a sequence now, and this file is the sequence. It computes
 * the whole thing up front, as a list of steps with durations, and hands it to
 * something that plays it. Nothing here touches React, a canvas, or a clock.
 *
 * That buys three things:
 *
 *   It can be checked.   tools/sequence-check.ts runs every outcome of every
 *                        level through `planPost` and asserts the shape.
 *   It can be skipped.   `final` is known before the first frame, so jumping to
 *                        the end can never leave the world half-changed.
 *   It can be read.      the order of events is a list, not a pile of numbers
 *                        spread across two hundred lines.
 */

import { brokenKeeps, spotted, type Keep, type Level, type Tell, type WorldState } from './level';
import { assess, type Suspicion } from './suspicion';
import { CROWD, type Chapter, type Message } from './story';
import type { DiffReport } from './diff';
import type { Cue } from './sound';
import type { Zone } from './zones';
import type { FeedItem } from '../components/Feed';

/** a feed item before the feed gives it an id */
export type Post = Omit<FeedItem, 'id'>;

/** who replies. The man zooming in is not one of them */
const HIM = 'cal_hampton_77';

/**
 * What the street made of the post, decided once.
 *
 * Kept separate from `planPost` so the check can hand it verdicts that would be
 * awkward to produce from real pixels — a fatal tell on a level whose fatal tell
 * needs a particular kind of bad paint, say.
 */
export type Verdict =
  | { kind: 'mirrored' }
  | { kind: 'untrusted'; unreadable: boolean }
  | { kind: 'nothing'; missed: string | null }
  | { kind: 'keeps'; broken: Keep[] }
  | {
      kind: 'landed';
      /** what this post on its own looked like: the notes he leads with */
      smell: Suspicion;
      /**
       * What the whole job has cost, this post included.
       *
       * Separate from `smell.total` because the two answer different questions.
       * He points at the worst thing in the picture in front of him, but he
       * starts digging on the strength of everything you have shown him — which
       * is what stops three careful little posts being cheaper than one honest
       * one.
       */
      heat: number;
      hits: Tell[];
      fatal: Tell | null;
      after: WorldState;
      stuck: string[];
      flags: string[];
    };

export type Step = { ms: number; posts: Post[]; cue?: Cue; dms?: Message[] } & (
  | {
      /** the file you sent, and the photograph Leonida printed from it */
      kind: 'print';
      sent: string;
      printed: string;
      /** false when nothing changed: there is no new world to develop into */
      develop: boolean;
      /** what the street did about it, one line per flag that landed */
      lines: string[];
      sub: string | null;
    }
  | { kind: 'react'; reply: Post }
  /** zone null means the tell is about the whole photograph, not a place in it */
  | { kind: 'zoom'; image: string; zone: Zone | null; text: string }
  | {
      kind: 'revert';
      from: string;
      to: string;
      line: string;
      fix: string;
      /** the world to hold once this has played, or been skipped past */
      apply: { earned: string[]; choice: string | null };
    }
  | { kind: 'client'; messages: Message[] }
  | { kind: 'closing'; text: string }
  | { kind: 'nothing'; line: string }
);

/** the world after everything, known before anything has played */
export type Final = {
  earned: string[];
  choice: string | null;
  /** the photograph to hand back to the editor */
  editorImage: string;
  landed: boolean;
};

export type Sequence = {
  steps: Step[];
  /** the world the moment the sequence starts, which is everything that stuck */
  opening: { earned: string[]; choice: string | null };
  final: Final;
  landed: boolean;
};

export type PlanInput = {
  level: Level;
  chapter: Chapter;
  verdict: Verdict;
  /** what the player actually saved */
  image: string;
  /** the photograph they were handed, and the one to go back to if nothing lands */
  source: string;
  earned: string[];
  choice: string | null;
  picked: string | null;
  /** whether this job's payoff has already played, so it plays once */
  beat: boolean;
  render: (state: WorldState) => string;
  /** shuffle-and-take, injectable so a check can be deterministic */
  pick?: <T>(xs: T[], n: number) => T[];
};

/**
 * How long each beat holds.
 *
 * Read as: long enough to take in, short enough that a second play is not a
 * chore. The print beat grows with the number of lines it has to stamp.
 */
export const TIMING = {
  print: 2600,
  perLine: 450,
  reply: 900,
  zoom: 3400,
  revert: 3600,
  clientBase: 1800,
  clientEach: 1300,
  closing: 3800,
  nothing: 2200,
} as const;

const shuffle = <T,>(xs: T[], n: number): T[] =>
  [...xs].sort(() => Math.random() - 0.5).slice(0, n);

/** What the street made of it. The order of these tests is the order it thinks in. */
export function judge(
  level: Level,
  report: DiffReport,
  flags: string[],
  ctx: {
    earned: string[];
    choice: string | null;
    picked: string | null;
    /** suspicion for the whole job so far, this post included */
    carried?: number;
  },
): Verdict {
  if (report.alignment.mirrored) return { kind: 'mirrored' };
  if (!report.trusted) return { kind: 'untrusted', unreadable: report.unreadable };
  if (flags.length === 0) return { kind: 'nothing', missed: level.nearMiss?.(report) ?? null };

  const broken = brokenKeeps(level, report);
  if (broken.length > 0) return { kind: 'keeps', broken };

  const stuck = Array.from(new Set([...ctx.earned, ...flags]));
  const after = level.apply(level.initial, stuck);
  const written = ctx.picked ?? ctx.choice;
  if (level.choice && written) after[level.choice.key] = written;

  const hits = spotted(level, report, after);
  const smell = assess(level, report);
  return {
    kind: 'landed',
    smell,
    heat: ctx.carried ?? smell.total,
    hits,
    fatal: hits.find((t) => t.fatal) ?? null,
    after,
    stuck,
    flags,
  };
}

export function planPost(input: PlanInput): Sequence {
  const { level, chapter, verdict, image, source, earned, choice, picked, beat, render } = input;
  const pick = input.pick ?? shuffle;
  const steps: Step[] = [];

  /**
   * What the street sees.
   *
   * Not the file the player saved. A forged photograph is a scruffy thing — a
   * black bar at an angle, a shape in roughly the right colour — and putting
   * that in the feed makes the game look like a collage app. The edit is the
   * instruction; what gets posted is the photograph Leonida produced from it.
   * The one person who looks at the real file is the man zooming in.
   */
  const posted = (img: string): Post => ({
    kind: 'post',
    who: 'you',
    text: level.goal,
    image: img,
    sent: img === image ? undefined : image,
    likes: 3,
  });

  const system = (text: string): Post => ({ kind: 'system', who: '', text, likes: 0 });

  /** the short outcome: it went up, somebody said something, nothing moved */
  function unchanged(reply: Post, line: string): Sequence {
    steps.push({
      kind: 'print',
      ms: TIMING.nothing,
      sent: image,
      printed: image,
      develop: false,
      lines: [],
      sub: null,
      posts: [posted(image)],
      cue: 'post',
    });
    steps.push({ kind: 'react', ms: TIMING.reply, reply, posts: [reply], cue: 'reply' });
    steps.push({ kind: 'nothing', ms: TIMING.nothing, line, posts: [system(line)] });
    return {
      steps,
      opening: { earned, choice },
      final: { earned, choice, editorImage: source, landed: false },
      landed: false,
    };
  }

  if (verdict.kind === 'mirrored') {
    /**
     * A flipped photograph is not an edit, it is the same photograph backwards.
     * Every sign in it reads the wrong way round.
     */
    return unchanged(
      { kind: 'reply', who: 'marla_qt', text: 'every sign in this reads backwards lol', likes: 64 },
      'NOBODY BELIEVED IT. NOTHING CHANGED.',
    );
  }

  if (verdict.kind === 'untrusted') {
    return unchanged(
      {
        kind: 'reply',
        who: 'nine_lives_vc',
        text: verdict.unreadable ? 'thats just a black square my guy' : 'what am i even looking at',
        likes: 12,
      },
      'NOTHING CHANGED.',
    );
  }

  if (verdict.kind === 'nothing') {
    return unchanged(
      {
        kind: 'reply',
        who: 'nine_lives_vc',
        text: verdict.missed ?? 'bro what did you even do 😐',
        likes: verdict.missed ? 73 : 41,
      },
      'NOTHING CHANGED.',
    );
  }

  if (verdict.kind === 'keeps') {
    // a post nobody believes changes nothing, no matter what it removed
    return unchanged(
      {
        kind: 'reply',
        who: 'marla_qt',
        text: `${verdict.broken[0].why}. this could be anywhere.`,
        likes: 88,
      },
      'NOBODY BELIEVED IT. NOTHING CHANGED.',
    );
  }

  // ------------------------------------------------------------------ it landed
  const { smell, hits, fatal, after, stuck, flags } = verdict;
  const written = picked ?? choice;
  const printed = render(after);

  const lines = level.flags.filter((f) => flags.includes(f.name)).map((f) => f.says.toUpperCase());

  steps.push({
    kind: 'print',
    ms: TIMING.print + lines.length * TIMING.perLine,
    sent: image,
    printed,
    develop: true,
    lines,
    sub: 'YOUR PIXELS WERE THE INSTRUCTION. THIS IS WHAT LEONIDA PRINTED.',
    posts: [posted(printed), ...lines.map(system)],
    cue: 'post',
  });

  /**
   * People comment on what they can see, so the replies belong to the flags that
   * actually landed. One ambient line goes in as noise — filtered against the
   * picks first, because the two pools overlap and two people saying the same
   * sentence word for word is the thing that gets noticed.
   */
  const said = level.flags.filter((f) => flags.includes(f.name)).flatMap((f) => f.chatter);
  const picks = pick(said, 2);
  const noise = pick(
    level.reactions.filter((t) => !picks.includes(t)),
    1,
  );
  for (const [i, text] of Array.from(new Set([...picks, ...noise])).entries()) {
    const reply: Post = { kind: 'reply', who: CROWD[i % CROWD.length], text, likes: 4 + i * 11 };
    steps.push({ kind: 'react', ms: TIMING.reply, reply, posts: [reply], cue: 'reply' });
  }

  if (hits.length > 0 || verdict.heat > level.tolerance) {
    const tell = hits[0];
    /**
     * With no tell he is going on smell alone, so he leads with the worst thing
     * he can see and zooms into the place he saw it. `notes` is sorted worst
     * first; taking whichever came out of the map first let him point at a
     * corner nobody touched and complain about the cheapest edit in the photo.
     */
    const worst = smell.notes[0];
    const zone = tell
      ? level.zones[tell.zone]
      : (worst && level.zones[worst.zone]) ?? level.zones[Object.keys(level.zones)[0]];
    const text = tell
      ? tell.post
      : `${worst?.note ?? 'something about this one does not sit right'}. cant put my finger on it yet.`;

    steps.push({
      kind: 'zoom',
      ms: TIMING.zoom,
      image,
      zone: tell?.whole ? null : zone,
      text,
      cue: 'sting',
      posts: [
        {
          kind: 'him',
          who: HIM,
          text,
          likes: 210,
          ...(tell?.whole ? { image } : { zoom: { image, zone } }),
        },
      ],
    });
  }

  // what the world holds once this post is over
  let finalEarned = stuck;
  let finalChoice = written;
  let editorImage = printed;

  if (fatal?.reverts) {
    const back = stuck.filter((f) => f !== fatal.reverts);
    const losesChoice = Boolean(level.choice && fatal.reverts === level.choice.when);
    const held = losesChoice ? null : written;
    const to = (() => {
      const w = level.apply(level.initial, back);
      if (level.choice && held) w[level.choice.key] = held;
      return render(w);
    })();
    const line = 'PEOPLE BELIEVED HIM. IT WENT BACK.';

    steps.push({
      kind: 'revert',
      ms: TIMING.revert,
      from: printed,
      to,
      line,
      fix: fatal.fix ?? 'He was believed, so the street undid it. Try it a way he cannot catch.',
      apply: { earned: back, choice: held },
      posts: [system(line)],
      cue: 'revert',
    });

    finalEarned = back;
    finalChoice = held;
    editorImage = to;
  }

  const landed = level.solved(after) && !fatal;

  if (landed && !beat) {
    steps.push({
      kind: 'client',
      ms: TIMING.clientBase + chapter.payoff.length * TIMING.clientEach,
      messages: chapter.payoff,
      dms: chapter.payoff,
      posts: [],
      cue: 'landed',
    });
    steps.push({
      kind: 'closing',
      ms: TIMING.closing,
      text: chapter.himClosing,
      posts: [{ kind: 'him', who: HIM, text: chapter.himClosing, likes: 180 }],
      cue: 'sting',
    });
  }

  return {
    steps,
    opening: { earned: stuck, choice: written },
    final: { earned: finalEarned, choice: finalChoice, editorImage, landed },
    landed,
  };
}
