'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from './Feed';
import ZoomView from './ZoomView';
import type { Final, Sequence, Step } from '@/lib/sequence';
import type { Message } from '@/lib/story';
import type { Zone } from '@/lib/zones';
import type { Post } from '@/lib/sequence';

/**
 * The post, played as one thing on one surface.
 *
 * Everything that happens after POST IT used to be spread across the whole
 * interface and timed by fifteen independent timeouts. This takes the workspace
 * for the length of it: the file you sent, the photograph the city printed from
 * it, what the street said, and — if he caught you — the zoom and the undo.
 *
 * The sequence itself is computed elsewhere (src/lib/sequence.ts). This plays it
 * and draws it, and knows nothing about levels or flags.
 */

/**
 * One timer, one step.
 *
 * Nothing here schedules more than a single timeout, which is what makes
 * skipping honest: there is never a second beat in flight that could land after
 * the player has moved on. `start` is only ever called from an event handler, so
 * a double-invoked effect cannot fire a step twice.
 */
export function useSequence(handlers: {
  onStep: (step: Step, index: number) => void;
  /** the promise is awaited before the stage lifts, so the editor can swap behind it */
  onDone: (final: Final, remaining: Step[]) => void | Promise<void>;
}) {
  const [seq, setSeq] = useState<Sequence | null>(null);
  const [index, setIndex] = useState(0);
  const timer = useRef<number | null>(null);
  const running = useRef<Sequence | null>(null);
  const at = useRef(0);
  const live = useRef(handlers);
  useEffect(() => {
    live.current = handlers;
  });

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const finish = useCallback(
    async (remaining: Step[]) => {
      stop();
      const s = running.current;
      if (!s) return;
      running.current = null;
      await live.current.onDone(s.final, remaining);
      setSeq(null);
      setIndex(0);
    },
    [stop],
  );

  const fire = useCallback(
    function fire(i: number) {
      const s = running.current;
      if (!s) return;
      const step = s.steps[i];
      if (!step) {
        void finish([]);
        return;
      }
      at.current = i;
      setIndex(i);
      live.current.onStep(step, i);
      stop();
      timer.current = window.setTimeout(() => fire(i + 1), step.ms);
    },
    [finish, stop],
  );

  const start = useCallback(
    (s: Sequence) => {
      running.current = s;
      at.current = 0;
      setSeq(s);
      setIndex(0);
      fire(0);
    },
    [fire],
  );

  /** straight to the next beat, without waiting it out */
  const advance = useCallback(() => {
    if (!running.current) return;
    fire(at.current + 1);
  }, [fire]);

  /**
   * Everything that has not played yet, applied at once.
   *
   * The end state was computed before the first frame, so this cannot land the
   * world anywhere a full watch would not have — including halfway through a
   * revert, which is the one place a partial application would be wrong.
   */
  const skip = useCallback(() => {
    const s = running.current;
    if (!s) return;
    void finish(s.steps.slice(at.current + 1));
  }, [finish]);

  return { seq, index, step: seq?.steps[index] ?? null, start, advance, skip };
}

/** everything visible at this point in the sequence, folded out of the steps so far */
function scene(steps: Step[], index: number) {
  let sent = '';
  let printed = '';
  let develop = false;
  let lines: string[] = [];
  let sub: string | null = null;
  let nothing: string | null = null;
  let zoom: { image: string; zone: Zone | null; text: string } | null = null;
  let undone: { from: string; to: string; line: string; fix: string } | null = null;
  let dms: Message[] = [];
  const replies: Post[] = [];

  for (let i = 0; i <= index && i < steps.length; i++) {
    const s = steps[i];
    if (s.kind === 'print') {
      sent = s.sent;
      printed = s.printed;
      develop = s.develop;
      lines = s.lines;
      sub = s.sub;
    } else if (s.kind === 'react') replies.push(s.reply);
    else if (s.kind === 'zoom') zoom = { image: s.image, zone: s.zone, text: s.text };
    else if (s.kind === 'revert') undone = { from: s.from, to: s.to, line: s.line, fix: s.fix };
    else if (s.kind === 'client') dms = s.messages;
    else if (s.kind === 'nothing') nothing = s.line;
  }

  return { sent, printed, develop, lines, sub, nothing, zoom, undone, dms, replies };
}

export default function PostStage({
  steps,
  index,
  onAdvance,
  onSkip,
}: {
  steps: Step[];
  index: number;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const now = steps[index];
  const s = scene(steps, index);
  /**
   * Underneath is whatever ends up true; over it is whatever is being taken away.
   *
   * On a normal post that is the file you sent underneath and the printed city
   * wiping in over it. On a revert it is the other way round — the world he
   * argued you back to sits underneath, and the version you posted wipes off it.
   * Getting this the wrong way round plays the undo as though it were the edit.
   */
  const under = s.undone ? s.undone.to : s.sent;
  const over = s.undone ? s.undone.from : s.printed;

  // Esc gets out, anything else goes on. Both are listened for at the window so
  // they work wherever the pointer happens to be
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAdvance, onSkip]);

  return (
    <div
      data-testid="post-stage"
      onClick={onAdvance}
      className="absolute inset-0 z-[45] flex cursor-pointer flex-col bg-ink"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* ----------------------------------------------------- the photograph */}
        {now?.kind === 'closing' ? (
          <div
            data-testid="his-beat"
            className="flex h-full flex-col items-center justify-center px-8 text-center"
          >
            <Avatar who="cal_hampton_77" size={64} />
            <p className="eyebrow mt-3 text-xs tracking-[0.32em] text-accent">@cal_hampton_77</p>
            <p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.6rem)] leading-relaxed text-text">
              {now.text}
            </p>
          </div>
        ) : now?.kind === 'zoom' && s.zoom ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
            <div className="w-full max-w-3xl">
              {s.zoom.zone ? (
                <ZoomView image={s.zoom.image} zone={s.zoom.zone} height="52vh" scale={2.4} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={s.zoom.image}
                  alt=""
                  className="max-h-[52vh] w-full border border-accent object-contain"
                />
              )}
            </div>
            <div className="max-w-2xl text-center">
              <p className="eyebrow text-xs tracking-[0.32em] text-accent">@cal_hampton_77</p>
              <p className="type-on mt-2 text-[clamp(0.9rem,1.8vw,1.15rem)] leading-relaxed text-text">
                {s.zoom.text.split(' ').map((w, i) => (
                  <span key={`${i}-${w}`} style={{ ['--i' as string]: i }}>
                    {w}{' '}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            {/*
              One box, both photographs, exactly on top of each other.
              The file the player sent and the one the city printed are often
              different shapes — a crop is a different shape, that is the point —
              so they are contained inside a fixed 3:2 frame rather than sized to
              themselves. Stacked any other way the wipe reads as two pictures
              sliding past each other instead of one picture changing its mind.
            */}
            <div className="relative aspect-[3/2] h-full max-h-full w-full max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={under}
                alt={s.undone ? 'what the street went back to' : 'what you sent'}
                className="absolute inset-0 h-full w-full object-contain"
              />
              {/* over it: what the city printed, wiping in. On a revert the wipe
                  runs the other way and takes the change back out again */}
              {(s.undone || (s.develop && over)) && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={s.undone ? `undo-${index}` : `develop-${over.length}`}
                  data-testid="stage-world"
                  src={over}
                  alt="what the street printed"
                  className={`absolute inset-0 h-full w-full object-contain ${
                    s.undone ? 'un-print' : 'develop'
                  }`}
                />
              )}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- what it did */}
        {/* Once he has been believed, what the street said it did is no longer
            true — leaving "THE CAR IS OUT OF THE PICTURE" over a photograph with
            the car back in it reads as a bug rather than as a reversal. */}
        {now?.kind !== 'closing' && now?.kind !== 'zoom' && !s.undone && (
          <div className="pointer-events-none absolute left-0 top-0 max-w-[52%] p-5">
            {s.lines.map((line, i) => (
              <p
                key={line}
                data-testid="stage-line"
                className="stamp display mb-1.5 inline-block bg-ink/90 px-2 py-0.5 text-[clamp(1rem,2.6vw,1.9rem)] leading-tight text-text"
                style={{ animationDelay: `${i * 380}ms` }}
              >
                {line}
              </p>
            ))}
            {s.nothing && (
              <p
                data-testid="stage-nothing"
                className="stamp display bg-ink/90 px-2 py-0.5 text-[clamp(1rem,2.6vw,1.9rem)] leading-tight text-mute"
              >
                {s.nothing}
              </p>
            )}
            {s.sub && s.lines.length > 0 && (
              <p
                className="stamp mt-1 max-w-md text-[10px] leading-snug tracking-[0.14em] text-dim"
                style={{ animationDelay: `${s.lines.length * 380}ms` }}
              >
                {s.sub}
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------- he was believed */}
        {s.undone && (now.kind === 'revert' || now.kind === 'nothing') && (
          <div className="pointer-events-none absolute bottom-5 left-5 max-w-md border-l-2 border-accent bg-ink/95 px-3 py-2">
            <p className="eyebrow text-[11px] text-accent">{s.undone.line}</p>
            <p className="mt-1 text-[11px] leading-snug text-text/80">{s.undone.fix}</p>
          </div>
        )}

        {/* ------------------------------------------------------------ the crowd */}
        {s.replies.length > 0 && now?.kind !== 'closing' && now?.kind !== 'zoom' && now?.kind !== 'revert' && (
          <div className="pointer-events-none absolute bottom-5 right-5 flex w-[300px] flex-col gap-1.5">
            {s.replies.slice(-3).map((r) => (
              <div
                key={r.text}
                data-testid="stage-reply"
                className="card-in flex gap-2 border-l-2 border-line bg-panel/95 px-2.5 py-1.5"
              >
                <Avatar who={r.who} size={22} />
                <div>
                  <p className="text-[10px] text-dim">
                    @{r.who} <span className="text-dim">♥ {r.likes}</span>
                  </p>
                  <p className="text-[11px] leading-snug text-text/90">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ----------------------------------------------------------- the client */}
        {s.dms.length > 0 && now?.kind === 'client' && (
          <div className="pointer-events-none absolute right-5 top-5 flex w-[260px] flex-col gap-1.5 border border-line bg-panel/95 p-2.5">
            <p className="eyebrow text-[10px] text-accent">The client</p>
            {s.dms.map((m, i) => (
              <p
                key={`${i}-${m.text.slice(0, 12)}`}
                className="card-in text-[11px] leading-snug text-text/90"
                style={{ animationDelay: `${i * 420}ms` }}
              >
                {m.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- the footer */}
      <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-2">
        <span className="eyebrow text-[10px] text-dim">
          Click or space to go on · Esc to skip
        </span>
        <span className="ml-auto flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 w-4 ${i <= index ? 'bg-accent' : 'bg-line'}`}
            />
          ))}
        </span>
        <button
          data-testid="stage-skip"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="eyebrow border border-line px-3 py-1 text-[10px] text-mute hover:border-accent hover:text-text"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
