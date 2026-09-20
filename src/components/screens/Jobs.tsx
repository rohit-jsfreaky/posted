'use client';

import { useEffect, useRef, useState } from 'react';
import { LEVELS } from '@/lib/levels';
import { CHAPTERS } from '@/lib/story';

/**
 * Job select.
 *
 * One card per job, using that level's own background as its photograph, so the
 * card and the thing it opens are the same place. Done jobs get a tick, the next
 * one is selectable, later ones are locked until you reach them.
 *
 * The cards run in a strip that scrolls sideways rather than a grid. A grid with
 * a column count in it is a grid that breaks the day a job is added — which is
 * exactly what happened: the sixth wrapped onto a second row, off the bottom of a
 * screen that does not scroll.
 */

/** Keyed by level id, because the running order is not the order these were written in. */
const CARD_ART: Record<number, string> = {
  1: '/art/bg-club.jpg',
  2: '/art/bg-street.jpg',
  3: '/art/bg-marina.jpg',
  4: '/art/bg-lot.jpg',
  5: '/art/bg-archive.jpg',
  6: '/art/bg-diner.jpg',
};

export default function Jobs({
  done,
  onPick,
  onBack,
}: {
  /** how many jobs are finished; that is also the index of the next one */
  done: number;
  onPick: (index: number) => void;
  onBack: () => void;
}) {
  const [at, setAt] = useState(Math.min(done, LEVELS.length - 1));
  const strip = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);

  // the job you are up to can be off the right-hand end of the strip on arrival
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [at]);
  const selected = LEVELS[at];
  const chapter = CHAPTERS[at];
  const locked = (i: number) => i > done;

  return (
    <main className="flex h-full w-full flex-col overflow-hidden bg-ink">
      <header className="flex items-start justify-between p-6 sm:px-10 sm:pt-8">
        <div>
          <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] text-text">Jobs</h1>
          <div className="mt-2 h-[2px] w-40 bg-accent" />
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[11px] tracking-[0.16em] text-mute">
            {done} OF {LEVELS.length} COMPLETE
          </span>
          <button
            onClick={onBack}
            className="eyebrow border border-line px-3 py-1.5 text-[11px] text-mute hover:border-accent hover:text-text"
          >
            Back
          </button>
        </div>
      </header>

      <div
        ref={strip}
        className="scroll-thin flex min-h-0 flex-1 items-center overflow-x-auto overflow-y-hidden px-6 sm:px-10"
      >
        <div className="flex h-[min(58vh,30rem)] gap-3 sm:gap-4">
          {LEVELS.map((level, i) => {
            const isLocked = locked(i);
            const isDone = i < done;
            const isOn = i === at;
            return (
              <button
                key={level.id}
                ref={isOn ? current : undefined}
                data-testid={`job-${level.id}`}
                disabled={isLocked}
                onMouseEnter={() => !isLocked && setAt(i)}
                onClick={() => !isLocked && onPick(i)}
                className={`group relative flex h-full w-[clamp(9rem,15vw,14rem)] shrink-0 flex-col overflow-hidden border text-left transition-all ${
                  isOn && !isLocked
                    ? 'border-accent'
                    : 'border-line hover:border-mute'
                } ${isLocked ? 'cursor-not-allowed opacity-40' : ''}`}
                style={{ transform: isOn && !isLocked ? 'scale(1.03)' : undefined }}
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={CARD_ART[level.id]}
                    alt=""
                    className={`h-full w-full object-cover ${isLocked ? 'grayscale' : ''}`}
                  />
                  {isDone && (
                    <span className="absolute right-0 top-0 bg-accent px-2 py-1 text-[11px] font-bold text-accent-ink">
                      ✓
                    </span>
                  )}
                  {isLocked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-2xl text-text/80">
                      ⬤
                    </span>
                  )}
                </div>
                {/* sizes to its text: the photograph takes everything else. It used
                    to share the height with flex-1, which left half a card of
                    empty panel under every title */}
                <div className="flex shrink-0 flex-col gap-1 bg-panel p-3">
                  <span className="text-[10px] tracking-[0.16em] text-mute">
                    JOB {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="display text-[clamp(0.85rem,1.3vw,1.15rem)] text-text">
                    {level.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="flex items-center gap-6 border-t border-line px-6 py-4 sm:px-10">
        <span className="whitespace-nowrap text-[11px] tracking-[0.16em] text-mute">
          CLIENT: <span className="text-text">{selected.client}</span>
        </span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <span className="truncate text-[11px] text-mute">
          BRIEF: <span className="text-text/80">{selected.brief}</span>
        </span>
        <span className="ml-auto whitespace-nowrap text-[11px] tracking-[0.16em] text-dim">
          CHAPTER {chapter.card.toUpperCase()}
        </span>
      </footer>
    </main>
  );
}
