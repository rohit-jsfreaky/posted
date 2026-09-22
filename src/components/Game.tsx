'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageEditor, {
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from '@unlayer/react-image-editor';
import CaseCard from './CaseCard';
import Feed, { Avatar, HIM, type FeedItem } from './Feed';
import PostStage, { useSequence } from './PostStage';
import ZoomView from './ZoomView';
import { type DiffReport, diffImages } from '@/lib/diff';
import { readFlags, renderLevel, toolConfig, type Level } from '@/lib/level';
import { bandFor, CLOSENESS, type Standing } from '@/lib/heat';
import { loadThread, remember, thumbnail, type HisPost } from '@/lib/thread';
import { judge, planPost, type Final, type Step } from '@/lib/sequence';
import { assess, methodFor } from '@/lib/suspicion';
import { EDITOR_TRANSLATIONS, SAVE_GROUP, VERBS } from '@/lib/verbs';
import { type Chapter, type Message } from '@/lib/story';
import { play, setMuted, startBed, stopBed } from '@/lib/sound';

/**
 * The loop, end to end:
 *   composite(state) -> editor -> save -> diff -> flags -> state -> composite(state)
 *
 * The player's pixels are read once and thrown away. What they see afterwards is
 * the world redrawn from authored art, which is the point of the whole thing.
 *
 * The layout is a HUD, not a page: one screen, nothing scrolls except the feed
 * and the client thread, each inside its own panel.
 */

type Pending = { report: DiffReport; flags: string[]; image: string };

let seq = 0;
const nextId = () => `i${seq++}`;

/**
 * One panel at a time, full height.
 *
 * The street used to be pinned above the other two, which left the feed a
 * squeezed strip at the bottom — the busiest panel in the game with the least
 * room. Each of them now gets the whole rail when it is the one you want, and
 * the game moves you between them at the moments that matter.
 */
type Rail = 'street' | 'client' | 'feed';

export default function Game({
  level,
  chapter,
  label,
  progress,
  isLastMain,
  onQuit,
  onSolved,
}: {
  level: Level;
  chapter: Chapter;
  /** what the header calls this one: "Job 03", or "Side job" */
  label: string;
  progress: Standing;
  /** the run's last chapter, so the button offers the ending rather than the next job */
  isLastMain: boolean;
  onQuit: () => void;
  /** what the job cost him, so the file can keep it */
  onSolved: (cost: number) => void;
}) {

  const [earned, setEarned] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  /** what the player is typing into the choice box before they commit it */
  const [typed, setTyped] = useState('');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [thread, setThread] = useState<Message[]>([]);
  /** a diff is in flight. The sequence that follows keeps POST IT down on its own */
  const [reading, setReading] = useState(false);
  const [beat, setBeat] = useState(false);
  /**
   * The chapter title, over the game, for a moment when the job opens.
   *
   * Five jobs with a story running through them read as five levels unless the
   * story is allowed to announce itself.
   */
  const [card, setCard] = useState(true);
  /** the job-done card waits until the sequence has finished playing */
  const [finale, setFinale] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [previewsLeft, setPreviewsLeft] = useState(2);
  const [preview, setPreview] = useState<{ zone: string; image: string; verdict: string } | null>(null);
  const [lastReport, setLastReport] = useState<DiffReport | null>(null);
  const [suspicion, setSuspicion] = useState(0);
  const [sound, setSound] = useState(true);
  /**
   * The rail shows one of these at a time. Stacked, the feed ended up as a
   * squeezed strip at the bottom of the screen — which is where the game's whole
   * reaction happens, so it needs the height.
   */
  const [rail, setRail] = useState<Rail>('client');
  /** DMs that arrived while the client tab was hidden */
  const [unseen, setUnseen] = useState(0);
  const [unread, setUnread] = useState(0);
  /**
   * Everything he has posted across the whole run, newest last.
   *
   * Read once, on the way in, rather than in an effect: the game only ever runs
   * in the browser, so storage is there on the first render and an effect would
   * mean a frame where he has forgotten everything.
   */
  const [his, setHis] = useState<HisPost[]>(() => loadThread());
  /** the feed can show the job's thread, or his case against you */
  const [onlyHim, setOnlyHim] = useState(false);
  /** how many hints the player has asked for on this job. Nothing is shown unasked */
  const [hints, setHints] = useState(0);
  /** three hints fill the panel, so they fold away once they have been read */
  const [hintsOpen, setHintsOpen] = useState(true);
  /** the legend explains the new verb; the rest is there when it is asked for */
  const [panelOpen, setPanelOpen] = useState(false);

  const editorRef = useRef<ImageEditorRef>(null);
  const feedEnd = useRef<HTMLDivElement>(null);
  /**
   * Which panel is open, readable from inside a handler.
   *
   * `push` counts an arrival as unread by whichever tab is showing, and the
   * sequence starts pushing in the same tick that moves the rail to the feed —
   * so the state has not landed yet and the first post of every sequence counted
   * itself as unread on the tab it was being shown on.
   */
  const railNow = useRef<Rail>('client');

  const world = useMemo(() => {
    const w = level.apply(level.initial, earned);
    if (level.choice && choice) w[level.choice.key] = choice;
    return w;
  }, [level, earned, choice]);

  const source = useMemo(() => renderLevel(level, world), [level, world]);
  const solved = level.solved(world);
  const options = useMemo(
    () => ({ theme: 'dark' as const, ...toolConfig(level) }),
    [level],
  );

  // arrivals only count as unread while the feed is the hidden tab
  const push = useCallback((item: Omit<FeedItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: nextId() }]);
    setUnread((n) => (railNow.current === 'feed' ? 0 : n + 1));
  }, []);

  const openRail = useCallback((tab: Rail) => {
    railNow.current = tab;
    setRail(tab);
    if (tab === 'feed') setUnread(0);
    if (tab === 'client') setUnseen(0);
  }, []);

  // the brief arrives as a conversation. Only timers here, no direct setState
  useEffect(() => {
    const ids = chapter.dms.map((m, i) =>
      window.setTimeout(() => setThread((prev) => [...prev, m]), 400 + i * 1100),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [chapter]);

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

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items.length]);

  useEffect(() => {
    const t = window.setTimeout(() => setCard(false), 2600);
    return () => window.clearTimeout(t);
  }, []);

  /**
   * Escape backs out of whatever is covering the work.
   *
   * The zoom preview and the case-number box both had one way out, and it was a
   * button. The sequence taught Escape, so everything else should answer to it
   * too — except the chapter card, which is two seconds long and dismisses
   * itself on any click already.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (preview) {
        setPreview(null);
      } else if (pending) {
        setPending(null);
        setTyped('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, pending]);

  /**
   * The room this job happens in, for as long as you are in it.
   *
   * An external system being told about React state, which is what an effect is
   * actually for. It will not start until the player has clicked something —
   * browsers refuse — so the first job is silent until the first press.
   */
  useEffect(() => {
    startBed(level.ambience);
    return () => stopBed();
  }, [level]);

  /**
   * Everything that happens after POST IT, in order, on one surface.
   *
   * The sequence is worked out in full before the first frame of it plays — what
   * the street prints, what it says, whether he catches it and what it costs —
   * so skipping it can only ever land the world where watching it would have.
   * This does the three things a plan cannot: it makes noise, it puts things in
   * the feed, and it holds the world while the stage is up.
   */
  const onStep = useCallback(
    (step: Step) => {
      if (step.cue) play(step.cue);
      // two beats want a second layer: the city developing, and the push in
      if (step.kind === 'print' && step.develop) play('print');
      if (step.kind === 'zoom') play('zoom');
      for (const item of step.posts) push(item);
      const dms = step.dms;
      if (dms && dms.length > 0) {
        setThread((prev) => [...prev, ...dms]);
        setUnseen((n) => n + dms.length);
      }
      /**
       * Whatever he says goes on his own thread, which outlives the job.
       *
       * The thumbnail is worked out off the main path — it decodes an image, and
       * nothing about a beat playing should wait on that.
       */
      if (step.kind === 'zoom' || step.kind === 'closing') {
        const text = step.kind === 'zoom' ? step.text : step.text;
        const shot = step.kind === 'zoom' ? step.image : undefined;
        const zone = step.kind === 'zoom' ? (step.zone ?? undefined) : undefined;
        void (async () => {
          const small = shot ? await thumbnail(shot) : undefined;
          setHis(remember({ job: label, title: level.title, text, shot: small, zone }));
        })();
      }

      // he was believed, so the street takes it back
      if (step.kind === 'revert') {
        setEarned(step.apply.earned);
        if (level.choice) setChoice(step.apply.choice);
      }
    },
    [label, level, push],
  );

  /**
   * The end of it, however it was reached.
   *
   * Anything skipped past still happened — it goes into the feed silently, so
   * the thread reads the same whether it was watched or not. The editor is then
   * handed the photograph the city ended up with, and the stage does not lift
   * until that has landed, so there is never a frame of the old world showing.
   */
  const onDone = useCallback(
    async (final: Final, remaining: Step[]) => {
      for (const step of remaining) {
        for (const item of step.posts) push(item);
        const dms = step.dms;
        if (dms && dms.length > 0) {
          setThread((prev) => [...prev, ...dms]);
          setUnseen((n) => n + dms.length);
        }
      }
      setEarned(final.earned);
      if (level.choice) setChoice(final.choice);
      if (final.landed) setFinale(true);
      await editorRef.current?.editor?.reset(final.editorImage);
    },
    [level, push],
  );

  const stage = useSequence({ onStep, onDone });
  /** the diff, then the sequence: POST IT is down for both */
  const busy = reading || stage.seq !== null;

  function resolve(report: DiffReport, flags: string[], image: string, picked: string | null) {
    /**
     * Suspicion adds up over the job rather than describing the last upload.
     *
     * Measuring only the newest post made splitting a job across three small
     * ones strictly cheaper than doing it in one, which is an exploit rather
     * than a tactic. Everything you have shown him this job counts.
     */
    const carried = suspicion + assess(level, report).total;
    setSuspicion(carried);
    setLastReport(report);

    const sequence = planPost({
      level,
      chapter,
      verdict: judge(level, report, flags, { earned, choice, picked, carried }),
      image,
      source,
      earned,
      choice,
      picked,
      beat,
      render: (state) => renderLevel(level, state),
    });

    // the world the post leaves behind, held from the first frame so the stage
    // has something to develop into
    setEarned(sequence.opening.earned);
    if (level.choice) setChoice(sequence.opening.choice);
    if (sequence.landed) setBeat(true);
    openRail('feed');
    stage.start(sequence);
  }

  async function readPost(dataUrl: string) {
    setReading(true);
    try {
      const report = await diffImages(source, dataUrl, level.zones);
      const flags = readFlags(level, report);
      if (level.choice && flags.includes(level.choice.when) && !choice) {
        setPending({ report, flags, image: dataUrl });
        return;
      }
      resolve(report, flags, dataUrl, null);
    } finally {
      setReading(false);
    }
  }

  /**
   * Find the editor's own commit button, which the interface hides.
   *
   * Three ways of naming the same button, because each can fail on its own and
   * they fail differently. The label is ours, so it is right by construction
   * until a runtime renames the key underneath it. The tick is the icon the
   * library draws on a confirm, and it is scoped to the hidden group so the crop
   * panel's own Apply cannot answer instead. Last is last: the group is laid out
   * as an optional chat toggle, then Cancel, then Save, so the end of it is the
   * commit even when the front of it is something we have not seen.
   */
  function findCommit(): HTMLButtonElement | null {
    const group = document.querySelector(SAVE_GROUP);
    const buttons = Array.from(group?.querySelectorAll('button') ?? []);
    const save = EDITOR_TRANSLATIONS['image_editor.toolbar.save'];
    return (
      buttons.find((b) => b.textContent?.trim() === save) ??
      buttons.find((b) => b.querySelector('svg[data-icon="check"]')) ??
      buttons.at(-1) ??
      null
    );
  }

  /**
   * Post from our own button.
   *
   * This presses the editor's own commit rather than reading the canvas, because
   * a pending crop is not applied until that commit happens — `getImage()` hands
   * back the picture with the crop still floating over it, so posting that way
   * silently drops the one edit Level 1 is about. The editor's Save is hidden in
   * the UI, but it is still the correct path, and `onSave` routes back here.
   *
   * If the editor's markup ever changes and the button cannot be found, fall back
   * to reading the canvas: filters and overlays still come through, and a post
   * that misses a crop beats a button that does nothing.
   */
  async function postIt() {
    const commit = findCommit();
    if (commit) {
      commit.click();
      return;
    }
    const current = editorRef.current?.editor?.getImage();
    if (current) await readPost(current);
  }

  /** Look at your own edit the way a skeptic would, before you commit to it. */
  async function runPreview(zoneName: string) {
    if (previewsLeft <= 0) return;
    const current = editorRef.current?.editor?.getImage();
    if (!current) return;
    setReading(true);
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
                    : method === 'dimmed'
                      ? 'darker than the rest of the photo says it should be'
                      : method === 'covered'
                        ? 'covered, and it reads as covered'
                        // every method the engine infers has a branch above, and
                        // the content check makes sure of it. This is here so a
                        // new one shows up as nothing rather than as a wrong answer
                        : 'something happened here, and I cannot tell you what';
      setPreview({ zone: zoneName, image: current, verdict });
      setPreviewsLeft((n) => n - 1);
    } finally {
      setReading(false);
    }
  }

  /**
   * The last post in one sentence, for the end of the forensics bar.
   *
   * The numbers beside it are the evidence; this is the finding. It is the same
   * assessment he works from, so it cannot disagree with what he goes on to say.
   */
  const verdictNote = (() => {
    if (!lastReport) return '';
    if (!lastReport.trusted) {
      return lastReport.unreadable
        ? 'Crushed past the point where anything can be read off it.'
        : 'He could not place this against the original at all.';
    }
    const worst = assess(level, lastReport).notes[0];
    return worst ? `${worst.note}.` : 'Nothing in this one he could point at.';
  })();

  const heat = Math.min(1, suspicion / level.tolerance);
  const segments = 12;
  const lit = Math.round(heat * segments);
  /**
   * The run so far, with this job counted in.
   *
   * The job you are on has not been banked yet, so the stored figure is one job
   * behind — which would mean the card on the done screen, and the readout in
   * the header, both ignoring the work being celebrated.
   */
  const standing: Standing = {
    ...progress,
    heat: progress.heat + suspicion,
    budget: progress.budget + level.tolerance,
  };
  const band = bandFor(standing.heat, standing.budget);

  return (
    <main className="flex h-full w-full flex-col overflow-hidden bg-ink">
      {/* ---------------------------------------------------------------- top bar */}
      <header className="flex shrink-0 items-center gap-4 border-b border-line px-4 py-2.5">
        <button
          onClick={onQuit}
          className="eyebrow border border-line px-2 py-1 text-[10px] text-mute hover:border-accent hover:text-text"
        >
          Jobs
        </button>
        <h1 className="display truncate text-lg text-text sm:text-2xl">
          <span className="text-mute">{label}</span>{' '}
          {level.title}
        </h1>
        {/* a chip, not a sentence: what it means is written out once, in the
            panel, where somebody can read it without the toolbar shouting */}
        {level.teachesTool && (
          <span className="hidden shrink-0 border border-accent px-1.5 py-0.5 text-[10px] tracking-[0.14em] text-accent lg:block">
            NEW · {VERBS[level.teachesTool].label}
          </span>
        )}

        <div className="ml-auto flex items-center gap-4">
          {/*
            Both meters are about the same man, so they read as one block: what
            this job has shown him, and what the whole run has. Apart, they looked
            like two unrelated systems.
          */}
          <div
            className="flex items-center gap-2 border border-line px-2.5 py-1"
            title={`This job has cost you ${suspicion} of ${level.tolerance}. Across the run he is at: ${CLOSENESS[band]}.`}
          >
            <span className="text-[10px] tracking-[0.16em] text-mute">HE HAS</span>
            <span
              data-testid="closeness"
              className={`eyebrow text-[11px] ${band === 'nothing' ? 'text-good' : 'text-accent'}`}
            >
              {CLOSENESS[band]}
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="text-[10px] tracking-[0.16em] text-dim">THIS JOB</span>
          <div data-testid="suspicion" className="flex gap-[3px]" title={`${suspicion}/${level.tolerance}`}>
            {Array.from({ length: segments }).map((_, i) => (
              <span
                key={i}
                className={`h-3.5 w-2.5 ${
                  i < lit ? (heat > 0.85 ? 'bg-accent' : 'bg-accent/80') : 'bg-line'
                }`}
              />
            ))}
          </div>
          </div>
          <button
            onClick={() => {
              const next = !sound;
              setSound(next);
              setMuted(!next);
              if (next) startBed(level.ambience);
            }}
            className="eyebrow border border-line px-2 py-1 text-[10px] text-mute hover:border-accent hover:text-text"
          >
            {sound ? 'Sound on' : 'Sound off'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------------------------------------ workspace */}
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/* the editor fills whatever height is left; minHeight 0 stops its own
              default 500px floor from pushing the page taller than the window */}
          <div className="editor-shell flex min-h-0 flex-1 flex-col overflow-hidden [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1">
            <ImageEditor
              key={level.id}
              ref={editorRef}
              image={source}
              minHeight={0}
              style={{ flex: 1, minHeight: 0 }}
              options={options}
              onSave={({ dataUrl }: ImageEditorSaveResult) => void readPost(dataUrl)}
              onCancel={() => void editorRef.current?.editor?.reset(source)}
            />
          </div>

          {/* The swap is the game, so it takes the room. Everything a post causes
              plays here, over the work, rather than as a toast above it and a
              thumbnail inside a tab that might not even be open. */}
          {stage.seq && (
            <PostStage
              steps={stage.seq.steps}
              index={stage.index}
              onAdvance={stage.advance}
              onSkip={stage.skip}
            />
          )}

          {/* ----------------------------------------------------- action row */}
          {/*
            The row that commits. It read as debug output before — "ZOOM 2" and
            four grey pills with the internal names of the zones on them — so the
            heading says what the buttons are for and the buttons look like
            buttons.
          */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow text-[11px] text-text">
                Check before you post
                {previewsLeft > 0 ? (
                  <span className="ml-2 text-accent">{previewsLeft} left</span>
                ) : (
                  <span className="ml-2 text-dim">none left</span>
                )}
              </span>
              {Object.keys(level.zones).map((z) => (
                <button
                  key={z}
                  data-testid={`preview-${z}`}
                  onClick={() => void runPreview(z)}
                  disabled={previewsLeft <= 0 || busy}
                  title={`See what a skeptic would notice about the ${z.replace(/_/g, ' ')}`}
                  className="flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-[10px] text-mute hover:border-mute hover:text-text disabled:opacity-30"
                >
                  <Glass />
                  {z.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => void editorRef.current?.editor?.reset(source)}
                title="Throw your edit away and start this photograph again"
                className="eyebrow border border-line px-4 py-2.5 text-[11px] text-mute hover:border-accent hover:text-text"
              >
                Start the photo again
              </button>
              <button
                data-testid="post-it"
                onClick={() => void postIt()}
                disabled={busy}
                className="display flex items-center gap-2 bg-accent px-8 py-2.5 text-xl text-accent-ink hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Reading…' : 'Post it'}
                {!busy && <span aria-hidden>&rarr;</span>}
              </button>
            </div>
          </div>

          {/*
            Everything he could have measured, measured. Nobody has to open it to
            play, but the claim the whole game rests on is that the edit is read
            rather than guessed at, and this is that claim with its working shown.
            Along the bottom rather than folded into the corner, because a row of
            measurements wants width and because pinned over the workspace it sat
            on top of the photograph.
          */}
          {lastReport && (
            <details
              data-testid="forensics"
              className="group shrink-0 border-t border-line bg-panel/60"
            >
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-2">
                <span className="eyebrow text-[10px] text-mute group-open:text-accent">
                  Forensics
                </span>
                <span className="text-[10px] text-dim">
                  what the engine read off the file you sent
                </span>
                <span className="eyebrow ml-auto text-[10px] text-dim">
                  {lastReport.trusted ? 'readable' : 'unplaceable'}
                </span>
              </summary>

              <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-line px-4 py-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px] text-mute">
                  <dt className="text-dim">light</dt>
                  <dd data-testid="gain">{lastReport.gain.toFixed(3)}× what it was</dd>
                  <dt className="text-dim">frame</dt>
                  <dd>
                    {lastReport.dims.saved[0]}×{lastReport.dims.saved[1]}
                    {lastReport.dims.changed ? ' — not the shape it was' : ' — unchanged'}
                  </dd>
                  <dt className="text-dim">angle</dt>
                  <dd>
                    {lastReport.alignment.rotation}°
                    {lastReport.alignment.mirrored ? ', mirrored' : ''} · matched{' '}
                    {(lastReport.alignment.score * 100).toFixed(0)}%
                  </dd>
                </dl>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px] text-mute">
                  {Object.entries(lastReport.zones).map(([name, z]) => (
                    <ZoneRow key={name} name={name} z={z} />
                  ))}
                </dl>

                <div className="ml-auto max-w-[15rem]">
                  <p className="eyebrow text-[10px] text-mute">What he would make of it</p>
                  <p className="mt-1 text-[10px] leading-snug text-text/80">
                    {verdictNote}
                  </p>
                </div>
              </div>
            </details>
          )}
        </section>

        {/* ----------------------------------------------------------- right rail */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-line xl:w-[460px]">
          {/* one panel at a time, each of them the full height of the rail */}
          <div className="flex shrink-0 border-b border-line">
            {(['street', 'client', 'feed'] as const).map((tab) => {
              const badge = tab === 'feed' ? unread : tab === 'client' ? unseen : 0;
              return (
                <button
                  key={tab}
                  data-testid={`tab-${tab}`}
                  onClick={() => openRail(tab)}
                  className={`eyebrow flex-1 px-2 py-2.5 text-[11px] ${
                    rail === tab ? 'bg-accent text-accent-ink' : 'text-mute hover:text-text'
                  }`}
                >
                  {tab === 'street' ? 'The street' : tab === 'client' ? 'Client' : 'Feed'}
                  {badge > 0 && rail !== tab && (
                    <span className="ml-1.5 bg-accent px-1 text-[10px] text-accent-ink">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/*
            What the job needs, and what must survive it, across the panel rather
            than down it. Stacked, these two plus the hints pushed the feed into a
            strip at the bottom of the screen — which is where the entire reaction
            to a post happens.
          */}
          <div className="shrink-0 border-b border-line px-3 py-2.5">
            {/* the objectives are sentences and the keeps are single words, so
                they do not want the same share of the width */}
            <div className="grid grid-cols-[1.45fr_1fr] gap-x-3">
              <div>
            <h2 className="eyebrow text-xs text-text">This job needs</h2>
            <ul data-testid="objectives" className="mt-2 flex flex-col gap-1">
              {level.flags
                .filter((f) => level.required.includes(f.name))
                .map((f) => {
                  const got = earned.includes(f.name);
                  return (
                    <li key={f.name} className="flex items-center gap-2 text-[11px]">
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[9px] ${
                          got ? 'bg-good text-accent-ink' : 'border border-line text-dim'
                        }`}
                      >
                        {got ? '✓' : ''}
                      </span>
                      <span className={got ? 'text-mute line-through' : 'text-text/90'}>
                        {f.goal}
                      </span>
                    </li>
                  );
                })}
            </ul>
              </div>

              {/* "KEEP IN SHOT: facade, sign" was the zone names and no verb.
                  Nobody reading it knew they were being told not to crop */}
              <div className="border-l border-line pl-3">
                <h2 className="eyebrow text-xs text-text">Do not crop away</h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {level.keeps.map((k) => (
                    <li key={k.zone} className="flex gap-1.5 text-[11px] text-text/90">
                      <span className="text-dim">—</span>
                      {k.zone.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[10px] leading-snug text-dim">
                  Without {level.keeps.length > 1 ? 'them' : 'it'} nobody believes the post.
                </p>
              </div>
            </div>

            {/* working out which manipulation solves it is the game, so the hints
                sit behind a button and come one at a time. Once read they fold
                away, because three of them push the client and the feed off the
                bottom of the panel */}
            {/* the hints are a card of their own, numbered, capped and scrolling
                inside themselves, so three of them cannot push the feed off the
                bottom of the panel */}
            {hints > 0 && (
              <div className="mt-3 border border-line bg-panel">
                <div className="flex items-center justify-between border-b border-line px-2 py-1.5">
                  <span className="eyebrow text-[10px] text-mute">
                    Hint {hints}/{level.hints.length}
                  </span>
                  <button
                    data-testid="hint-fold"
                    onClick={() => setHintsOpen((v) => !v)}
                    className="eyebrow text-[10px] text-accent hover:text-text"
                  >
                    {hintsOpen ? 'Hide' : 'Show'}
                  </button>
                </div>
                {hintsOpen && (
                  <div className="scroll-thin max-h-44 overflow-y-auto px-2 py-2">
                    {level.hints.slice(0, hints).map((h, i) => (
                      <div key={h.slice(0, 14)} data-testid="hint" className="rise flex gap-2 py-1">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-accent text-[9px] text-accent-ink">
                          {i + 1}
                        </span>
                        <p className="text-[11px] leading-snug text-text/85">{h}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {hints < level.hints.length && (
              <button
                data-testid="hint-button"
                onClick={() => {
                  setHints((n) => n + 1);
                  setHintsOpen(true);
                }}
                className="eyebrow mt-2 w-full border border-line py-2 text-[10px] text-mute hover:border-accent hover:text-text"
              >
                {hints === 0 ? 'Stuck? Get a hint' : `Another hint  ${hints}/${level.hints.length}`}
              </button>
            )}
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {rail === 'street' ? (
              <div>
                <div className="flex items-baseline justify-between pb-2">
                  <h2 className="eyebrow text-xs text-text">As it is now</h2>
                  <span className="text-[10px] tracking-[0.14em] text-accent">LIVE</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-testid="world"
                  src={source}
                  alt="the world as it is now"
                  className="w-full border border-line"
                />
                {/* True on every job, worth saying on the first one. `progress`
                    already counts the job you are in as done, so the very first
                    one reads as main 1 and no side work rather than as zero. */}
                {progress.main <= 1 && progress.side === 0 && (
                  <p className="mt-3 text-[11px] leading-snug text-mute">
                    This is the photograph Leonida has. Every post you land rewrites it, and the
                    next job starts from whatever it says.
                  </p>
                )}

                {/* What each control in the editor does to the city, rather than to
                    the picture. The rail says it in full because the editor's own
                    tool column only has room for the verb. */}
                <div className="mt-4 border-t border-line pt-3">
                  {/*
                    Eight tools by the last job, each with a sentence, is sixteen
                    lines of prose in a side panel nobody asked to read. The one
                    being taught explains itself; the rest stay a list until
                    somebody wants them.
                  */}
                  <div className="flex items-baseline justify-between">
                    <h2 className="eyebrow text-xs text-text">What each tool does here</h2>
                    <button
                      data-testid="panel-fold"
                      onClick={() => setPanelOpen((v) => !v)}
                      className="eyebrow text-[10px] text-accent hover:text-text"
                    >
                      {panelOpen ? 'Less' : 'What they all do'}
                    </button>
                  </div>
                  <ul data-testid="panel" className="mt-2 flex flex-col gap-2">
                    {level.tools.map((t) => {
                      const v = VERBS[t];
                      const isNew = t === level.teachesTool;
                      return (
                        <li
                          key={t}
                          className={`border-l-2 pl-2 ${isNew ? 'border-accent' : 'border-line'}`}
                        >
                          <span className="eyebrow text-[10px] text-text">{v.label}</span>
                          <span className="ml-1.5 text-[10px] text-dim">· {t}</span>
                          {isNew && (
                            <span className="ml-1.5 text-[9px] tracking-[0.14em] text-accent">
                              NEW
                            </span>
                          )}
                          {(isNew || panelOpen) && (
                            <p className="text-[11px] leading-snug text-mute">{v.line}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : rail === 'client' ? (
              <div className="flex flex-col gap-1.5">
                {/* whoever is paying, at the top, so you know who you are working for */}
                <div className="mb-1 flex items-center gap-2 border-b border-line pb-2">
                  <Avatar who={level.client} size={30} />
                  <div>
                    <p className="text-[11px] text-text">@{level.client}</p>
                    <p className="text-[10px] text-dim">the client</p>
                  </div>
                </div>
                {thread.map((m, i) => (
                  <p
                    key={`${i}-${m.text.slice(0, 10)}`}
                    className={`rise max-w-[88%] px-2.5 py-1.5 text-xs leading-snug ${
                      m.from === 'you'
                        ? 'self-end bg-accent text-accent-ink'
                        : m.from === 'system'
                          ? 'self-center text-center text-[10px] text-dim'
                          : 'self-start bg-raised text-text/90'
                    }`}
                  >
                    {m.text}
                  </p>
                ))}
              </div>
            ) : (
              <>
                {/* The whole point of him is that he remembers. Two chips: what
                    is happening now, and the folder he has been building since
                    job one — which is what "same hand on all three" means. */}
                {his.length > 0 && (
                  <div className="mb-2 flex gap-1">
                    {([false, true] as const).map((mine) => (
                      <button
                        key={String(mine)}
                        data-testid={mine ? 'feed-his' : 'feed-all'}
                        onClick={() => setOnlyHim(mine)}
                        className={`eyebrow px-2 py-1 text-[10px] ${
                          onlyHim === mine
                            ? 'bg-accent text-accent-ink'
                            : 'border border-line text-mute hover:text-text'
                        }`}
                      >
                        {mine ? `His case  ${his.length}` : 'This job'}
                      </button>
                    ))}
                  </div>
                )}

                {onlyHim ? (
                  <div data-testid="his-thread" className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 border-b border-line pb-2">
                      <Avatar who={HIM} size={30} />
                      <p className="text-[10px] leading-snug text-dim">
                        Everything @{HIM} has posted about your work, oldest first. He keeps
                        the originals.
                      </p>
                    </div>
                    {[...his].map((p, i) => (
                      <article
                        key={`${i}-${p.text.slice(0, 12)}`}
                        className="border-l-2 border-accent bg-raised p-2"
                      >
                        <p className="eyebrow text-[9px] text-dim">
                          {p.job} · {p.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-text/90">{p.text}</p>
                        {p.shot && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.shot}
                            alt=""
                            className="mt-1.5 w-full border border-line"
                          />
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <>
                    <Feed items={items} />
                    <div ref={feedEnd} />
                  </>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------------- overlays */}
      {preview && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/85 p-6">
          <div className="w-full max-w-lg border border-line bg-panel">
            <p className="eyebrow border-b border-line px-4 py-2 text-xs text-accent">
              What a skeptic sees — {preview.zone.replace(/_/g, ' ')}
            </p>
            <div className="p-4">
              <ZoomView image={preview.image} zone={level.zones[preview.zone]} height={220} ring={false} />
              <p className="mt-3 text-sm text-text/85">{preview.verdict}</p>
              <button
                onClick={() => setPreview(null)}
                className="eyebrow mt-4 border border-line px-4 py-2 text-xs text-text hover:border-accent"
              >
                Back to it
              </button>
            </div>
          </div>
        </div>
      )}

      {solved && finale && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/85 p-6">
          <div
            data-testid="solved"
            className="scroll-thin max-h-full w-full max-w-3xl overflow-y-auto border border-line bg-panel p-7"
          >
            <p className="eyebrow text-xs tracking-[0.2em] text-good">Job done</p>
            <h2 className="display mt-3 text-3xl text-text">{level.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-text/80">{level.epilogue}</p>

            <CaseCard progress={standing} />

            <button
              data-testid="next-level"
              onClick={() => onSolved(suspicion)}
              className="display mt-5 w-full bg-accent py-2 text-xl text-accent-ink hover:brightness-110"
            >
              {isLastMain ? 'See how it ends' : 'Next job'}
            </button>
          </div>
        </div>
      )}

      {card && (
        <button
          data-testid="chapter-card"
          onClick={() => setCard(false)}
          className="absolute inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-ink px-8 text-center"
        >
          <p className="eyebrow text-xs tracking-[0.42em] text-accent">
            Chapter {chapter.card}
          </p>
          <h2 className="display mt-4 text-[clamp(2rem,6vw,4.5rem)] text-text">
            {level.title}
          </h2>
          <div className="mt-5 h-[2px] w-24 bg-accent" />
          <p className="mt-5 max-w-md text-[11px] leading-relaxed text-mute">
            {level.goal}
          </p>
        </button>
      )}

      {pending && level.choice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/90 p-6">
          <form
            className="w-full max-w-sm border border-line bg-panel p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const written = typed.trim();
              if (!written) return;
              const p = pending;
              setPending(null);
              setTyped('');
              resolve(p.report, p.flags, p.image, written);
            }}
          >
            <p className="eyebrow text-xs text-accent">{level.choice.prompt}</p>
            <p className="mt-2 text-xs leading-snug text-mute">
              The label changed, but the editor hands back a picture, not words —
              nobody can read your handwriting from here. Type it again and the
              street will print it exactly as you wrote it.
            </p>
            <input
              data-testid="choice-input"
              autoFocus
              value={typed}
              maxLength={level.choice.maxLength}
              placeholder={level.choice.placeholder}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-4 w-full border border-line bg-ink px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
            />
            <button
              data-testid="choice-confirm"
              type="submit"
              disabled={!typed.trim()}
              className="eyebrow mt-3 w-full bg-accent py-2 text-xs text-accent-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-dim"
            >
              That is what it says
            </button>
          </form>
        </div>
      )}

      {/* Everything he could have measured, measured. Nobody has to open this to
          play — but the claim the whole game rests on is that the edit is read
          rather than guessed at, and this is that claim with its working shown. */}
      {lastReport && (
        <div />
      )}
    </main>
  );
}

/** the one icon in the action row: these buttons look at a part of the photo */
function Glass() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 L21 21" />
    </svg>
  );
}

function ZoneRow({
  name,
  z,
}: {
  name: string;
  z: { missing: number; structure: number; drift: number; grain: number };
}) {
  return (
    <>
      <dt className="text-dim">{name.replace(/_/g, ' ')}</dt>
      <dd>
        {(z.missing * 100).toFixed(0)}% gone · {(z.structure * 100).toFixed(0)}% changed ·{' '}
        {z.drift > 0 ? '+' : ''}
        {z.drift.toFixed(3)} light
      </dd>
    </>
  );
}
