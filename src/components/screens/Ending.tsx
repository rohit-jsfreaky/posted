'use client';

import { ENDING } from '@/lib/story';

/** The last screen. Five jobs, and the man who was right about all of them. */
export default function Ending({ onRestart }: { onRestart: () => void }) {
  return (
    <main className="relative h-full w-full overflow-hidden bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/bg-marina.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale"
      />
      <div className="absolute inset-0 bg-ink/70" />

      <div className="relative flex h-full flex-col justify-center px-8 sm:px-16">
        <p className="eyebrow text-xs tracking-[0.3em] text-accent">Posted</p>
        <h1 className="display mt-4 max-w-4xl text-[clamp(2.2rem,6vw,5rem)] text-text">
          {ENDING.headline}
        </h1>
        <div className="mt-6 h-[2px] w-40 bg-accent" />
        <div className="mt-6 flex max-w-2xl flex-col gap-3">
          {ENDING.body.map((line) => (
            <p key={line.slice(0, 16)} className="text-sm leading-relaxed text-text/75">
              {line}
            </p>
          ))}
        </div>
        <button
          data-testid="restart"
          onClick={onRestart}
          className="display mt-10 w-fit bg-accent px-6 py-2 text-xl text-accent-ink hover:brightness-110"
        >
          Start over
        </button>
      </div>
    </main>
  );
}
