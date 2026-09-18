'use client';

import { useState } from 'react';

/**
 * The title screen.
 *
 * The menu is a real list with a selected row, the way a console game's is: the
 * selection is a solid block of accent with the label knocked out of it, not a
 * hover underline. Arrow keys and the mouse both move it.
 */

type Item = { id: 'start' | 'jobs' | 'how' | 'credits' | 'reset'; label: string };

const HOW = [
  'Somebody sends you a photograph and tells you what they need to be true.',
  'You edit the photograph. Crop it, light it, cover something up — whatever it takes.',
  'You post it. Leonida rearranges itself to match. The bouncer is no longer on that door.',
  'One man zooms into everything you post. If he finds the flaw, the city puts it back.',
];

export default function Start({
  done,
  total,
  onStart,
  onJobs,
  onReset,
}: {
  done: number;
  total: number;
  onStart: () => void;
  onJobs: () => void;
  onReset: () => void;
}) {
  const [at, setAt] = useState(0);
  const [panel, setPanel] = useState<'how' | 'credits' | 'reset' | null>(null);

  // the save is the only thing the menu changes shape for: the first row says
  // what it will actually do, and erasing it is only offered once there is one
  const started = done > 0;
  const items: Item[] = [
    { id: 'start', label: started ? 'Continue' : 'Start' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'how', label: 'How it works' },
    { id: 'credits', label: 'Credits' },
    ...(started ? [{ id: 'reset' as const, label: 'Erase progress' }] : []),
  ];

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
        if (e.key === 'ArrowDown') setAt((n) => (n + 1) % items.length);
        if (e.key === 'ArrowUp') setAt((n) => (n - 1 + items.length) % items.length);
        if (e.key === 'Enter') choose(items[Math.min(at, items.length - 1)].id);
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
          {items.map((item, i) => {
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
        {started && (
          <p className="mt-2 text-[11px] tracking-[0.16em] text-accent">
            {done} OF {total} JOBS DONE — SAVED ON THIS BROWSER.
          </p>
        )}
      </div>

      <div className="absolute bottom-6 right-8 text-[11px] tracking-[0.16em] text-mute sm:right-12">
        LEONIDA, FL.
      </div>

      {panel && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/85 p-6">
          <div className="w-full max-w-xl border border-line bg-panel p-6">
            <p className="eyebrow text-xs text-accent">
              {panel === 'how' ? 'How it works' : panel === 'reset' ? 'Erase progress' : 'Credits'}
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
            ) : panel === 'reset' ? (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-text/85">
                  This clears the {done} job{done === 1 ? '' : 's'} you have finished and puts
                  you back at the first one. It cannot be undone.
                </p>
                <button
                  data-testid="reset-confirm"
                  onClick={() => {
                    onReset();
                    setAt(0);
                    setPanel(null);
                  }}
                  className="display w-fit bg-accent px-5 py-1.5 text-lg text-accent-ink hover:brightness-110"
                >
                  Erase it
                </button>
              </div>
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
              {panel === 'reset' ? 'Keep it' : 'Back'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
