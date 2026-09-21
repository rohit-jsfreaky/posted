"use client";

import CaseCard from "../CaseCard";
import { ENDING } from "@/lib/story";
import { bandFor, VERDICT, type Standing } from "@/lib/heat";
import { Avatar, HIM } from "../Feed";

/** The last screen. Five jobs, and the man who was right about all of them. */
export default function Ending({
  progress,
  onRestart,
}: {
  progress: Standing;
  onRestart: () => void;
}) {
  return (
    <main className="relative h-full w-full overflow-hidden bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/bg-marina.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale"
      />
      <div className="absolute inset-0 bg-ink/70" />

      {/* `justify-center` on a scrolling column clips whatever overflows the top,
          which is the oldest flexbox trap there is. An auto margin on the child
          centres it while it is short and lets it scroll properly once it is not */}
      <div className="scroll-thin relative h-full overflow-y-auto px-8 py-10 sm:px-16">
        <div className="my-auto flex min-h-full flex-col justify-center">
          <p className="eyebrow text-xs tracking-[0.3em] text-accent">Posted</p>
          <h1 className="display mt-4 max-w-4xl text-[clamp(2.2rem,6vw,5rem)] text-text">
            {ENDING.headline}
          </h1>
          <div className="mt-6 h-[2px] w-40 bg-accent" />
          <div className="mt-6 flex max-w-2xl flex-col gap-3">
            {ENDING.body.map((line) => (
              <p
                key={line.slice(0, 16)}
                className="text-sm leading-relaxed text-text/75"
              >
                {line}
              </p>
            ))}
            {/* the same ending either way — he was right, nobody checked — and
                one line about whether it ever cost you anything */}
            <p
              data-testid="verdict"
              className="mt-2 border-l-2 border-accent pl-3 text-sm leading-relaxed text-text"
            >
              {VERDICT[bandFor(progress.heat, progress.budget)]}
            </p>
          </div>
          {/*
            The file the city kept on you, in his hands.

            All five jobs, the city has been building this and handing it back as
            a reward — a rank, a photograph, a thing to save and show people.
            Here he publishes it. Nothing about the card changes. What changes is
            who is holding it, and that it is now the top post of the week.
          */}
          <div className="mt-10 w-full max-w-3xl">
            <article
              data-testid="his-file"
              className="border-l-2 border-accent bg-panel/80 p-4"
            >
              <div className="flex items-center gap-2">
                <Avatar who={HIM} size={30} />
                <p className="eyebrow text-xs tracking-[0.2em] text-accent">@{HIM}</p>
                <span className="ml-auto text-[10px] text-dim">♥ 41,208</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text/90">{ENDING.hisPost}</p>
              <CaseCard progress={progress} />
            </article>
          </div>

          <button
            data-testid="restart"
            onClick={onRestart}
            className="display mt-8 w-fit bg-accent px-6 py-2 text-xl text-accent-ink hover:brightness-110"
          >
            Start over
          </button>
        </div>
      </div>
    </main>
  );
}
