'use client';

import { useMemo, useRef, useState } from 'react';
import ImageEditor, {
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from '@unlayer/react-image-editor';
import { type DiffReport, type FlagName, detectFlags, diffImages } from '@/lib/diff';
import { JOB, applyFlags, isSolved } from '@/lib/level1';
import { INITIAL_STATE, type WorldState, compositeToDataUrl } from '@/lib/scene';

/**
 * The loop, end to end:
 *   composite(state) -> editor -> save -> diff -> flags -> state -> composite(state)
 *
 * The player's pixels are read once and thrown away. What they see afterwards is
 * the world redrawn from authored art, which is the point of the whole thing.
 */

type Post = {
  saved: string;
  flags: FlagName[];
  changes: string[];
  report: DiffReport;
};

const fmt = (n: number, places = 2) => n.toFixed(places);

export default function Game() {
  const [state, setState] = useState<WorldState>(INITIAL_STATE);
  const [post, setPost] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<ImageEditorRef>(null);

  const source = useMemo(() => compositeToDataUrl(state), [state]);
  const solved = isSolved(state);

  async function handleSave({ dataUrl }: ImageEditorSaveResult) {
    setBusy(true);
    try {
      const report = await diffImages(source, dataUrl);
      const flags = detectFlags(report);
      const { next, changes } = applyFlags(state, flags);
      setPost({ saved: dataUrl, flags, changes, report });

      const moved = JSON.stringify(next) !== JSON.stringify(state);
      if (moved) {
        setState(next);
      } else {
        // nothing landed, so put the street back the way it was
        void editorRef.current?.editor?.reset(source);
      }
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setPost(null);
    setState(INITIAL_STATE);
  }

  return (
    <main className="flex min-h-full flex-col gap-3 bg-[#0d0f13] p-3 text-[#e8e8e8] xl:flex-row">
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-[#262a31] bg-[#14171d] p-3">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-mono text-sm tracking-widest text-[#9aa0aa]">
            POSTED — LEVEL 1
          </h1>
          <span className="font-mono text-xs text-[#6b7078]">
            {busy ? 'reading the post…' : 'edit the photo, then press Save to post it'}
          </span>
        </header>

        <ImageEditor
          ref={editorRef}
          image={source}
          minHeight={600}
          options={{ theme: 'dark' }}
          onSave={handleSave}
          onCancel={() => void editorRef.current?.editor?.reset(source)}
        />
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-[380px]">
        <div className="rounded-lg border border-[#262a31] bg-[#14171d] p-3">
          <p className="font-mono text-xs text-[#6b7078]">
            DM — {JOB.client}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#c9d0d8]">{JOB.brief}</p>
        </div>

        <div className="rounded-lg border border-[#262a31] bg-[#14171d] p-3">
          <h2 className="mb-2 font-mono text-xs tracking-widest text-[#6b7078]">
            THE STREET RIGHT NOW
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="world"
            src={source}
            alt="the street"
            className="w-full rounded border border-[#262a31]"
          />
          <dl
            data-testid="state"
            className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-xs"
          >
            <dt className="text-[#6b7078]">time</dt>
            <dd>{state.time}</dd>
            <dt className="text-[#6b7078]">bouncer</dt>
            <dd>{state.bouncer ? 'on the door' : 'gone'}</dd>
            <dt className="text-[#6b7078]">door</dt>
            <dd>{state.door}</dd>
            <dt className="text-[#6b7078]">crowd</dt>
            <dd>{state.crowd ? 'queue outside' : 'empty'}</dd>
          </dl>
        </div>

        {solved && (
          <div
            data-testid="solved"
            className="rounded-lg border border-[#2f5e42] bg-[#16241c] p-3"
          >
            <p className="font-mono text-xs tracking-widest text-[#6ee7a8]">
              JOB DONE
            </p>
            <p className="mt-1 text-sm text-[#c9d0d8]">
              He walked in. $200 landed.
            </p>
            <button
              onClick={restart}
              className="mt-2 rounded border border-[#3a4049] px-3 py-1 font-mono text-xs text-[#9aa0aa] hover:border-[#5a626d]"
            >
              run it again
            </button>
          </div>
        )}

        {post && (
          <div className="rounded-lg border border-[#262a31] bg-[#14171d] p-3">
            <h2 className="mb-2 font-mono text-xs tracking-widest text-[#6b7078]">
              WHAT YOU POSTED
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.saved}
              alt="what you posted"
              className="w-full rounded border border-[#262a31]"
            />

            <p
              data-testid="flags"
              className="mt-2 font-mono text-xs text-[#c9d0d8]"
            >
              flags: {post.flags.join(' + ') || 'none'}
            </p>

            {post.changes.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-sm text-[#c9d0d8]">
                {post.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-[#8d939c]">
                {post.report.trusted
                  ? 'bro what did you even do 😐'
                  : 'nobody can tell what that photo is. nothing happened.'}
              </p>
            )}

            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-[10px] tracking-widest text-[#6b7078]">
                WHAT THE DIFF SAW
              </summary>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 font-mono text-[10px] text-[#8d939c]">
                <dt className="text-[#6b7078]">brightness</dt>
                <dd data-testid="gain">{fmt(post.report.gain, 3)}× original</dd>
                <dt className="text-[#6b7078]">saved size</dt>
                <dd>
                  {post.report.dims.saved[0]}×{post.report.dims.saved[1]}
                </dd>
                <dt className="text-[#6b7078]">rotation</dt>
                <dd>{post.report.alignment.rotation}°</dd>
                <dt className="text-[#6b7078]">scale / offset</dt>
                <dd>
                  {fmt(post.report.alignment.kx)} / {fmt(post.report.alignment.offX, 1)}
                </dd>
                <dt className="text-[#6b7078]">alignment fit</dt>
                <dd>{fmt(post.report.alignment.score, 3)}</dd>
                {Object.entries(post.report.zones).map(([name, z]) => (
                  <ZoneRow key={name} name={name} missing={z.missing} structure={z.structure} />
                ))}
              </dl>
            </details>
          </div>
        )}
      </aside>
    </main>
  );
}

function ZoneRow({
  name,
  missing,
  structure,
}: {
  name: string;
  missing: number;
  structure: number;
}) {
  return (
    <>
      <dt className="text-[#6b7078]">{name}</dt>
      <dd>
        {fmt(missing, 2)} gone / {fmt(structure, 3)} changed
      </dd>
    </>
  );
}
