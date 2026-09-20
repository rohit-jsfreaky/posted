'use client';

import { useEffect, useRef, useState } from 'react';
import { MAIN, SIDE } from '@/lib/levels';
import { CHAPTERS } from '@/lib/story';
import type { Level } from '@/lib/level';
import type { Progress } from '@/lib/save';

/**
 * The board.
 *
 * Two lists, because there are two kinds of work. The run is gated and is the
 * game: five jobs, one chapter each, and an ending. The side work is not gated
 * past the first job and can be ignored entirely — it is there for the parts of
 * the editor the story never needs, and skipping all of it still finishes the
 * game. The only thing it changes is what the file on you ends up saying.
 *
 * Each list is a strip that scrolls sideways. A grid with a column count in it
 * is a grid that breaks the next time a job is added.
 */

/** Keyed by level id, because the running order is not the order these were written in. */
const CARD_ART: Record<number, string> = {
  1: '/art/bg-club.jpg',
  2: '/art/bg-street.jpg',
  3: '/art/bg-marina.jpg',
  4: '/art/bg-lot.jpg',
  5: '/art/bg-archive.jpg',
  6: '/art/bg-diner.jpg',
  7: '/art/bg-dock.jpg',
};

type Pick = { kind: 'main'; at: number } | { kind: 'side'; id: number };

function Card({
  level,
  caption,
  title,
  done,
  locked,
  selected,
  onHover,
  onOpen,
  innerRef,
}: {
  level: Level;
  caption: string;
  title: string;
  done: boolean;
  locked: boolean;
  selected: boolean;
  onHover: () => void;
  onOpen: () => void;
  innerRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={innerRef}
      data-testid={`job-${level.id}`}
      disabled={locked}
      onMouseEnter={() => !locked && onHover()}
      onClick={() => !locked && onOpen()}
      className={`group relative flex h-full w-[clamp(9rem,14vw,13rem)] shrink-0 flex-col overflow-hidden border text-left transition-all ${
        selected && !locked ? 'border-accent' : 'border-line hover:border-mute'
      } ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
      style={{ transform: selected && !locked ? 'scale(1.03)' : undefined }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CARD_ART[level.id]}
          alt=""
          className={`h-full w-full object-cover ${locked ? 'grayscale' : ''}`}
        />
        {done && (
          <span className="absolute right-0 top-0 bg-accent px-2 py-1 text-[11px] font-bold text-accent-ink">
            ✓
          </span>
        )}
        {locked && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-2xl text-text/80">
            ⬤
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1 bg-panel p-3">
        <span className="text-[10px] tracking-[0.16em] text-mute">{caption}</span>
        <span className="display text-[clamp(0.8rem,1.2vw,1.05rem)] text-text">{title}</span>
      </div>
    </button>
  );
}

export default function Jobs({
  progress,
  onPick,
  onBack,
}: {
  progress: Progress;
  onPick: (what: Pick) => void;
  onBack: () => void;
}) {
  const [at, setAt] = useState<Pick>({
    kind: 'main',
    at: Math.min(progress.main, MAIN.length - 1),
  });
  const current = useRef<HTMLButtonElement>(null);

  // the job you are up to can be off the right-hand end of the strip on arrival
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [at]);

  const selected =
    at.kind === 'main' ? MAIN[at.at] : (SIDE.find((l) => l.id === at.id) ?? SIDE[0]);
  const note =
    at.kind === 'main' ? `CHAPTER ${CHAPTERS[at.at].card.toUpperCase()}` : 'OPTIONAL';

  // the side work opens once the first job has taught the loop
  const sideLocked = progress.main < 1;

  return (
    <main className="flex h-full w-full flex-col overflow-hidden bg-ink">
      <header className="flex items-start justify-between px-6 pb-3 pt-6 sm:px-10">
        <div>
          <h1 className="display text-[clamp(2rem,4.5vw,3.4rem)] text-text">Jobs</h1>
          <div className="mt-2 h-[2px] w-32 bg-accent" />
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[11px] tracking-[0.16em] text-mute">
            {progress.main} OF {MAIN.length}
            {SIDE.length > 0 && (
              <span className="text-dim">
                {'  ·  '}
                {progress.side.length}/{SIDE.length} SIDE
              </span>
            )}
          </span>
          <button
            onClick={onBack}
            className="eyebrow border border-line px-3 py-1.5 text-[11px] text-mute hover:border-accent hover:text-text"
          >
            Back
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 pb-2">
        <section className="flex min-h-0 flex-col">
          <p className="eyebrow shrink-0 px-6 pb-2 text-[10px] text-accent sm:px-10">
            The run
          </p>
          <div className="scroll-thin flex overflow-x-auto overflow-y-hidden px-6 sm:px-10">
            <div className="flex h-[min(38vh,19rem)] gap-3 sm:gap-4">
              {MAIN.map((level, i) => (
                <Card
                  key={level.id}
                  level={level}
                  caption={`JOB ${String(i + 1).padStart(2, '0')}`}
                  title={level.title}
                  done={i < progress.main}
                  locked={i > progress.main}
                  selected={at.kind === 'main' && at.at === i}
                  innerRef={at.kind === 'main' && at.at === i ? current : undefined}
                  onHover={() => setAt({ kind: 'main', at: i })}
                  onOpen={() => onPick({ kind: 'main', at: i })}
                />
              ))}
            </div>
          </div>
        </section>

        {SIDE.length > 0 && (
          <section className="flex min-h-0 flex-col">
            <p className="eyebrow shrink-0 px-6 pb-2 text-[10px] text-mute sm:px-10">
              Side work — optional, and it does not touch the ending
            </p>
            <div className="scroll-thin flex overflow-x-auto overflow-y-hidden px-6 sm:px-10">
              <div className="flex h-[min(28vh,14rem)] gap-3 sm:gap-4">
                {SIDE.map((level) => (
                  <Card
                    key={level.id}
                    level={level}
                    caption="SIDE JOB"
                    title={level.title}
                    done={progress.side.includes(level.id)}
                    locked={sideLocked}
                    selected={at.kind === 'side' && at.id === level.id}
                    innerRef={at.kind === 'side' && at.id === level.id ? current : undefined}
                    onHover={() => setAt({ kind: 'side', id: level.id })}
                    onOpen={() => onPick({ kind: 'side', id: level.id })}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="flex items-center gap-6 border-t border-line px-6 py-3 sm:px-10">
        <span className="whitespace-nowrap text-[11px] tracking-[0.16em] text-mute">
          CLIENT: <span className="text-text">{selected.client}</span>
        </span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <span className="truncate text-[11px] text-mute">
          BRIEF: <span className="text-text/80">{selected.brief}</span>
        </span>
        <span className="ml-auto whitespace-nowrap text-[11px] tracking-[0.16em] text-dim">
          {note}
        </span>
      </footer>
    </main>
  );
}
