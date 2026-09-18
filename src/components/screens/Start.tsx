'use client';

import { useState } from 'react';

/**
 * The title screen.
 *
 * The menu is a real list with a selected row, the way a console game's is: the
 * selection is a solid block of accent with the label knocked out of it, not a
 * hover underline. Arrow keys and the mouse both move it.
 */

type Item = { id: 'start' | 'jobs' | 'how' | 'credits'; label: string };

const ITEMS: Item[] = [
  { id: 'start', label: 'Start' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'how', label: 'How it works' },
  { id: 'credits', label: 'Credits' },
];

const HOW = [
  'Somebody sends you a photograph and tells you what they need to be true.',
  'You edit the photograph. Crop it, light it, cover something up — whatever it takes.',
  'You post it. Leonida rearranges itself to match. The bouncer is no longer on that door.',
  'One man zooms into everything you post. If he finds the flaw, the city puts it back.',
];

export default function Start({
  onStart,
  onJobs,
}: {
  onStart: () => void;
  onJobs: () => void;
}) {
  const [at, setAt] = useState(0);
  const [panel, setPanel] = useState<'how' | 'credits' | null>(null);

  function choose(id: Item['id']) {
    if (id === 'start') onStart();
    else if (id === 'jobs') onJobs();
    else setPanel(id);
  }

  return (
    <main
      className="relative h-full w-full overflow-hidden bg-ink"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') setAt((n) => (n + 1) % ITEMS.length);
        if (e.key === 'ArrowUp') setAt((n) => (n - 1 + ITEMS.length) % ITEMS.length);
        if (e.key === 'Enter') choose(ITEMS[at].id);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/bg-street.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* one flat scrim over the whole photo. A partial one leaves a visible seam
          down the middle, which is worse than losing a little of the picture */}
      <div className="absolute inset-0 bg-ink/62" />

      <div className="absolute inset-y-0 left-0 flex w-full max-w-[640px] flex-col justify-center p-8 sm:p-14">
        <h1 className="display text-[clamp(3.5rem,9vw,7.5rem)] text-text">Posted</h1>
        <div className="mt-4 h-[2px] w-[min(420px,70%)] bg-accent" />

        <nav className="mt-10 flex flex-col items-start gap-1">
          {ITEMS.map((item, i) => {
            const on = i === at;
            return (
              <button
                key={item.id}
                data-testid={`menu-${item.id}`}
                onMouseEnter={() => setAt(i)}
                onClick={() => choose(item.id)}
                className={`display px-3 py-1 text-[clamp(1.6rem,3.4vw,2.6rem)] transition-colors ${
                  on ? 'bg-accent text-accent-ink' : 'text-text/90 hover:text-text'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <p className="mt-10 text-[11px] tracking-[0.16em] text-mute">
          A GAME ABOUT LYING WITH PHOTOGRAPHS.
        </p>
      </div>

      <div className="absolute bottom-6 right-8 text-[11px] tracking-[0.16em] text-mute sm:right-12">
        LEONIDA, FL.
      </div>

      {panel && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/85 p-6">
          <div className="w-full max-w-xl border border-line bg-panel p-6">
            <p className="eyebrow text-xs text-accent">
              {panel === 'how' ? 'How it works' : 'Credits'}
            </p>
            {panel === 'how' ? (
              <ol className="mt-4 flex flex-col gap-3">
                {HOW.map((line, i) => (
                  <li key={line.slice(0, 12)} className="flex gap-3 text-sm leading-relaxed text-text/85">
                    <span className="text-accent">{String(i + 1).padStart(2, '0')}</span>
                    {line}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4 flex flex-col gap-2 text-sm text-text/85">
                <p>Built for the Unlayer Build With React Image Editor Challenge.</p>
                <p className="text-mute">
                  The editor is not decoration here. Which manipulation solves the
                  problem is the puzzle, and the game reads the result rather than
                  the tool.
                </p>
              </div>
            )}
            <button
              onClick={() => setPanel(null)}
              className="eyebrow mt-6 border border-line px-4 py-2 text-xs text-text hover:border-accent"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
