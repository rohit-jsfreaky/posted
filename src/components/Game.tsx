'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageEditor, {
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from '@unlayer/react-image-editor';
import Feed, { HIM, type FeedItem } from './Feed';
import ZoomView from './ZoomView';
import { type DiffReport, diffImages } from '@/lib/diff';
import {
  brokenKeeps,
  readFlags,
  renderLevel,
  spotted,
  toolConfig,
  type Level,
  type Tell,
} from '@/lib/level';
import { LEVELS } from '@/lib/levels';
import { assess, methodFor } from '@/lib/suspicion';

/**
 * The loop, end to end:
 *   composite(state) -> editor -> save -> diff -> flags -> state -> composite(state)
 *
 * The player's pixels are read once and thrown away. What they see afterwards is
 * the world redrawn from authored art, which is the point of the whole thing.
 */

type Pending = { report: DiffReport; flags: string[]; image: string };

let seq = 0;
const nextId = () => `i${seq++}`;

/** ?job=3 opens straight on that job. Handy for testing a single level. */
function startingLevel(): number {
  if (typeof window === 'undefined') return 0;
  const asked = Number(new URLSearchParams(window.location.search).get('job'));
  if (!Number.isFinite(asked) || asked < 1) return 0;
  return Math.min(LEVELS.length, Math.round(asked)) - 1;
}

export default function Game() {
  const [levelIndex, setLevelIndex] = useState(startingLevel);
  const [earned, setEarned] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [previewsLeft, setPreviewsLeft] = useState(2);
  const [preview, setPreview] = useState<{ zone: string; image: string; verdict: string } | null>(null);
  const [lastReport, setLastReport] = useState<DiffReport | null>(null);
  const [suspicion, setSuspicion] = useState(0);
  const [finished, setFinished] = useState(false);

  const editorRef = useRef<ImageEditorRef>(null);
  const timers = useRef<number[]>([]);

  const level: Level = LEVELS[levelIndex];

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const world = useMemo(() => {
    const w = level.apply(level.initial, earned);
    if (level.choice && choice) w[level.choice.key] = choice;
    return w;
  }, [level, earned, choice]);

  const source = useMemo(() => renderLevel(level, world), [level, world]);
  const solved = level.solved(world);

  // features is a remount-tier option, so keep the object stable per level
  const options = useMemo(
    () => ({ theme: 'dark' as const, ...toolConfig(level) }),
    [level],
  );

  const push = useCallback((item: Omit<FeedItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: nextId() }]);
  }, []);

  // counters tick upward on their own, the way they do on a real feed
  useEffect(() => {
    const t = window.setInterval(() => {
      setItems((prev) =>
        prev.map((it, i) =>
          it.kind === 'system'
            ? it
            : { ...it, likes: it.likes + Math.floor(Math.random() * (i === prev.length - 1 ? 9 : 3)) },
        ),
      );
    }, 1100);
    return () => window.clearInterval(t);
  }, []);

  function startLevel(index: number) {
    clearTimers();
    setLevelIndex(index);
    setEarned([]);
    setChoice(null);
    setItems([]);
    setPending(null);
    setPreview(null);
    setPreviewsLeft(2);
    setLastReport(null);
    setSuspicion(0);
  }

  function resolve(report: DiffReport, flags: string[], image: string, picked: string | null) {
    const broken = brokenKeeps(level, report);
    const smell = assess(level, report);
    setSuspicion(smell.total);
    setLastReport(report);

    push({ kind: 'post', who: 'you', text: level.goal, image, likes: 3 });

    if (!report.trusted) {
      later(700, () =>
        push({
          kind: 'reply',
          who: 'nine_lives_vc',
          text: report.unreadable
            ? 'thats just a black square my guy'
            : 'what am i even looking at',
          likes: 12,
        }),
      );
      void editorRef.current?.editor?.reset(source);
      return;
    }

    if (flags.length === 0) {
      later(700, () =>
        push({ kind: 'reply', who: 'nine_lives_vc', text: 'bro what did you even do 😐', likes: 41 }),
      );
      void editorRef.current?.editor?.reset(source);
      return;
    }

    // a post nobody believes changes nothing, no matter what it removed
    if (broken.length > 0) {
      later(700, () =>
        push({
          kind: 'reply',
          who: 'marla_qt',
          text: `${broken[0].why}. this could be anywhere.`,
          likes: 88,
        }),
      );
      later(1600, () =>
        push({ kind: 'system', who: '', text: 'NOBODY BELIEVED IT. NOTHING CHANGED.', likes: 0 }),
      );
      void editorRef.current?.editor?.reset(source);
      return;
    }

    const stuck = Array.from(new Set([...earned, ...flags]));
    setEarned(stuck);
    if (picked && level.choice) setChoice(picked);

    const after = level.apply(level.initial, stuck);
    if (level.choice && (picked ?? choice)) after[level.choice.key] = (picked ?? choice) as string;

    // what the street did about it
    const said = level.flags.filter((f) => flags.includes(f.name)).map((f) => f.says);
    said.forEach((line, i) =>
      later(500 + i * 450, () => push({ kind: 'system', who: '', text: line.toUpperCase(), likes: 0 })),
    );

    // the crowd, arriving one at a time and disagreeing with itself
    const crowd = [...level.reactions].sort(() => Math.random() - 0.5).slice(0, 3);
    crowd.forEach((text, i) =>
      later(1200 + i * 900, () =>
        push({
          kind: 'reply',
          who: ['nine_lives_vc', 'marla_qt', 'boardwalk_dan', 'leonida_lurker'][i % 4],
          text,
          likes: 4 + i * 11,
        }),
      ),
    );

    const hits: Tell[] = spotted(level, report, after);
    const overTolerance = smell.total > level.tolerance;
    const fatal = hits.find((t) => t.fatal);

    if (hits.length > 0 || overTolerance) {
      const tell = hits[0];
      const zone = tell ? level.zones[tell.zone] : level.zones[Object.keys(level.zones)[0]];
      const text = tell
        ? tell.post
        : `something about this is off. ${smell.notes[0]?.note ?? 'it does not sit right'}.`;

      later(3600, () =>
        push({ kind: 'him', who: HIM, text, image: undefined, likes: 210, zoom: { image, zone } }),
      );

      if (fatal?.reverts) {
        later(5200, () => {
          setEarned((prev) => prev.filter((f) => f !== fatal.reverts));
          if (level.choice && fatal.reverts === level.choice.when) setChoice(null);
          push({
            kind: 'system',
            who: '',
            text: 'PEOPLE BELIEVED HIM. IT WENT BACK.',
            likes: 0,
          });
        });
      }
    }

    void editorRef.current?.editor?.reset(source);
  }

  async function handleSave({ dataUrl }: ImageEditorSaveResult) {
    setBusy(true);
    try {
      const report = await diffImages(source, dataUrl, level.zones);
      const flags = readFlags(level, report);

      if (level.choice && flags.includes(level.choice.when) && !choice) {
        setPending({ report, flags, image: dataUrl });
        return;
      }
      resolve(report, flags, dataUrl, null);
    } finally {
      setBusy(false);
    }
  }

  /** Look at your own edit the way a skeptic would, before you commit to it. */
  async function runPreview(zoneName: string) {
    if (previewsLeft <= 0) return;
    const current = editorRef.current?.editor?.getImage();
    if (!current) return;
    setBusy(true);
    try {
      const report = await diffImages(source, current, level.zones);
      const z = report.zones[zoneName];
      const method = z ? methodFor(z) : null;
      const verdict = !report.trusted
        ? 'the whole photo is unreadable like this'
        : !z || !z.changed
          ? 'nothing to see here yet'
          : method === 'blurred'
            ? 'this is the only soft thing at that distance'
            : method === 'painted'
              ? 'the edges do not match anything around them'
              : method === 'pasted'
                ? 'it sits on top of the photo, not in it'
                : method === 'cropped'
                  ? 'gone, but the frame is a different shape now'
                  : method === 'blown'
                    ? 'blown out by the light. highlights do that on their own'
                    : 'covered, and it reads as covered';
      setPreview({ zone: zoneName, image: current, verdict });
      setPreviewsLeft((n) => n - 1);
    } finally {
      setBusy(false);
    }
  }

  function nextLevel() {
    if (levelIndex + 1 >= LEVELS.length) {
      setFinished(true);
      return;
    }
    startLevel(levelIndex + 1);
  }

  if (finished) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-4 bg-[#0d0f13] p-6 text-center text-[#e8e8e8]">
        <p className="font-mono text-xs tracking-[0.3em] text-[#6b7078]">POSTED</p>
        <h1 className="max-w-xl text-2xl leading-snug">He was right about all of it.</h1>
        <p className="max-w-md text-sm leading-relaxed text-[#8d939c]">
          Five jobs. A bouncer, a car, a brother, a parking bay and a police file.
          None of it happened, and all of it is true now.
        </p>
        <button
          onClick={() => {
            setFinished(false);
            startLevel(0);
          }}
          className="mt-2 rounded border border-[#3a4049] px-4 py-1.5 font-mono text-xs text-[#9aa0aa] hover:border-[#5a626d]"
        >
          start over
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-col gap-3 bg-[#0d0f13] p-3 text-[#e8e8e8] xl:flex-row">
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-[#262a31] bg-[#14171d] p-3">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-mono text-sm tracking-widest text-[#9aa0aa]">
            POSTED — JOB {level.id} OF {LEVELS.length}: {level.title.toUpperCase()}
          </h1>
          <span className="font-mono text-xs text-[#6b7078]">
            {busy ? 'reading the post…' : `new tool: ${level.teaches}`}
          </span>
        </header>

        <ImageEditor
          key={level.id}
          ref={editorRef}
          image={source}
          minHeight={560}
          options={options}
          onSave={handleSave}
          onCancel={() => void editorRef.current?.editor?.reset(source)}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-[#6b7078]">
            ZOOM PREVIEW ({previewsLeft} LEFT)
          </span>
          {Object.keys(level.zones).map((z) => (
            <button
              key={z}
              data-testid={`preview-${z}`}
              onClick={() => void runPreview(z)}
              disabled={previewsLeft <= 0 || busy}
              className="rounded border border-[#2f343d] px-2 py-1 font-mono text-[10px] text-[#8d939c] hover:border-[#5a626d] disabled:opacity-30"
            >
              {z.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {preview && (
          <div className="mt-2 rounded-lg border border-[#3a3050] bg-[#181526] p-2">
            <p className="mb-1 font-mono text-[10px] tracking-widest text-[#a08ec8]">
              WHAT A SKEPTIC SEES — {preview.zone.replace(/_/g, ' ').toUpperCase()}
            </p>
            <ZoomView
              image={preview.image}
              zone={level.zones[preview.zone]}
              height={150}
              ring={false}
            />
            <p className="mt-1 text-xs text-[#c9d0d8]">{preview.verdict}</p>
          </div>
        )}
      </section>

      <aside className="flex w-full shrink-0 flex-col gap-3 xl:w-[400px]">
        <div className="rounded-lg border border-[#262a31] bg-[#14171d] p-3">
          <p className="font-mono text-xs text-[#6b7078]">DM — {level.client}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#c9d0d8]">{level.brief}</p>
          <p className="mt-2 font-mono text-[10px] text-[#6b7078]">
            KEEP: {level.keeps.map((k) => k.zone.replace(/_/g, ' ')).join(', ')}
          </p>
        </div>

        <div className="rounded-lg border border-[#262a31] bg-[#14171d] p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-mono text-xs tracking-widest text-[#6b7078]">
              THE STREET RIGHT NOW
            </h2>
            <span
              data-testid="suspicion"
              className={`font-mono text-[10px] ${
                suspicion > level.tolerance ? 'text-[#ff8a8a]' : 'text-[#6b7078]'
              }`}
            >
              suspicion {suspicion}/{level.tolerance}
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="world"
            src={source}
            alt="the world as it is now"
            className="w-full rounded border border-[#262a31]"
          />
          <p data-testid="flags" className="mt-2 font-mono text-[10px] text-[#8d939c]">
            {earned.length > 0 ? earned.join(' + ') : 'nothing has stuck yet'}
          </p>
        </div>

        {solved && (
          <div
            data-testid="solved"
            className="rounded-lg border border-[#2f5e42] bg-[#16241c] p-3"
          >
            <p className="font-mono text-xs tracking-widest text-[#6ee7a8]">JOB DONE</p>
            <p className="mt-1 text-sm text-[#c9d0d8]">{level.epilogue}</p>
            <button
              data-testid="next-level"
              onClick={nextLevel}
              className="mt-2 rounded border border-[#3a4049] px-3 py-1 font-mono text-xs text-[#9aa0aa] hover:border-[#5a626d]"
            >
              {levelIndex + 1 >= LEVELS.length ? 'see how it ends' : 'next job'}
            </button>
          </div>
        )}

        <div className="flex-1 rounded-lg border border-[#262a31] bg-[#14171d] p-3">
          <h2 className="mb-2 font-mono text-xs tracking-widest text-[#6b7078]">THE FEED</h2>
          <Feed items={items} />
        </div>

        {lastReport && (
          <details className="rounded-lg border border-[#262a31] bg-[#14171d] p-3">
            <summary className="cursor-pointer font-mono text-[10px] tracking-widest text-[#6b7078]">
              WHAT THE DIFF SAW
            </summary>
            <dl className="mt-1 grid grid-cols-2 gap-x-3 font-mono text-[10px] text-[#8d939c]">
              <dt className="text-[#6b7078]">brightness</dt>
              <dd data-testid="gain">{lastReport.gain.toFixed(3)}×</dd>
              <dt className="text-[#6b7078]">saved size</dt>
              <dd>
                {lastReport.dims.saved[0]}×{lastReport.dims.saved[1]}
              </dd>
              <dt className="text-[#6b7078]">rotation / fit</dt>
              <dd>
                {lastReport.alignment.rotation}° / {lastReport.alignment.score.toFixed(3)}
              </dd>
              {Object.entries(lastReport.zones).map(([name, z]) => (
                <ZoneRow key={name} name={name} z={z} />
              ))}
            </dl>
          </details>
        )}
      </aside>

      {pending && level.choice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#3a4049] bg-[#14171d] p-4">
            <p className="font-mono text-xs tracking-widest text-[#6b7078]">
              {level.choice.prompt.toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-[#8d939c]">
              The label changed, but nobody can read your handwriting from here.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {level.choice.options.map((opt) => (
                <button
                  key={opt}
                  data-testid={`choice-${opt}`}
                  onClick={() => {
                    const p = pending;
                    setPending(null);
                    resolve(p.report, p.flags, p.image, opt);
                  }}
                  className="rounded border border-[#2f343d] px-3 py-2 text-left font-mono text-sm text-[#d2d8df] hover:border-[#6ee7a8]"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ZoneRow({
  name,
  z,
}: {
  name: string;
  z: { missing: number; structure: number; detail: number; grain: number; drift: number };
}) {
  return (
    <>
      <dt className="text-[#6b7078]">{name.replace(/_/g, ' ')}</dt>
      <dd>
        {z.missing.toFixed(2)} gone / {z.structure.toFixed(2)} changed /{' '}
        {z.drift.toFixed(3)} drift / {z.grain.toFixed(3)} grain
      </dd>
    </>
  );
}
