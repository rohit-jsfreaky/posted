'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageEditor, {
  type ImageEditorRef,
  type ImageEditorSaveResult,
} from '@unlayer/react-image-editor';
import CaseCard from './CaseCard';
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
import { CHAPTERS, type Message } from '@/lib/story';
import { play, setMuted } from '@/lib/sound';

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

export default function Game({
  index,
  onQuit,
  onSolved,
}: {
  index: number;
  onQuit: () => void;
  onSolved: () => void;
}) {
  const level: Level = LEVELS[index];
  const chapter = CHAPTERS[index];

  const [earned, setEarned] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  /** what the player is typing into the choice box before they commit it */
  const [typed, setTyped] = useState('');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [thread, setThread] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [beat, setBeat] = useState(false);
  /**
   * The chapter title, over the game, for a moment when the job opens.
   *
   * Five jobs with a story running through them read as five levels unless the
   * story is allowed to announce itself.
   */
  const [card, setCard] = useState(true);
  /** his closing line, alone on the screen, at the end of a chapter */
  const [hisBeat, setHisBeat] = useState<string | null>(null);
  /** the job-done card waits until the chapter has finished playing */
  const [finale, setFinale] = useState(false);
  /**
   * The edit the player saved, held over the street while it dissolves into the
   * photograph the world printed from it. The swap is the game; watching it
   * happen in the window marked LIVE is the difference between a mechanic and a
   * glitch.
   */
  const [sentShot, setSentShot] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
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
  const [rail, setRail] = useState<'client' | 'feed'>('client');
  const [unread, setUnread] = useState(0);
  /**
   * Shown over the workspace whenever the photograph under the editor is replaced.
   *
   * The world re-renders after every post that lands, so the picture the player was
   * working on is swapped for a new one. Without a word on screen that reads as the
   * game throwing their work away — and when a tell reverts a flag it reads as the
   * game undoing it out of spite. Both need saying.
   */
  const [notice, setNotice] = useState<{ head: string; body: string } | null>(null);
  /** how many hints the player has asked for on this job. Nothing is shown unasked */
  const [hints, setHints] = useState(0);
  /** three hints fill the panel, so they fold away once they have been read */
  const [hintsOpen, setHintsOpen] = useState(true);

  const editorRef = useRef<ImageEditorRef>(null);
  const timers = useRef<number[]>([]);
  const feedEnd = useRef<HTMLDivElement>(null);

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
  const options = useMemo(
    () => ({ theme: 'dark' as const, ...toolConfig(level) }),
    [level],
  );

  // arrivals only count as unread while the feed is the hidden tab
  const push = useCallback(
    (item: Omit<FeedItem, 'id'>) => {
      setItems((prev) => [...prev, { ...item, id: nextId() }]);
      setUnread((n) => (rail === 'feed' ? 0 : n + 1));
    },
    [rail],
  );

  // the brief arrives as a conversation. Only timers here, no direct setState
  useEffect(() => {
    const ids = CHAPTERS[index].dms.map((m, i) =>
      window.setTimeout(() => setThread((prev) => [...prev, m]), 400 + i * 1100),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [index]);

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
   * Hand the editor the photograph the world produced.
   *
   * `source` is a memo, so inside a handler it is still the photo from before this
   * post landed. Resetting to it puts the bouncer back on the door the moment you
   * remove him — the change shows in the feed and the workspace quietly rolls back,
   * which reads as the edit being thrown away rather than acted on.
   */
  function show(list: string[], pick: string | null) {
    const w = level.apply(level.initial, list);
    if (level.choice && pick) w[level.choice.key] = pick;
    void editorRef.current?.editor?.reset(renderLevel(level, w));
  }

  function resolve(report: DiffReport, flags: string[], image: string, picked: string | null) {
    const broken = brokenKeeps(level, report);
    const smell = assess(level, report);
    setSuspicion(smell.total);
    setLastReport(report);

    play('post');
    setRail('feed');

    /**
     * What the street sees.
     *
     * Not the file the player saved. A forged photograph is a scruffy thing — a
     * black bar sitting at an angle, a shape in roughly the right colour — and
     * putting that in the feed makes the game look like a collage app. The edit
     * is the instruction; what gets posted is the photograph Leonida produced
     * from it, which is the entire premise. The one person who looks at the real
     * file is the man zooming in, and his posts still carry it.
     */
    const posted = (img: string) =>
      push({
        kind: 'post',
        who: 'you',
        text: level.goal,
        image: img,
        sent: img === image ? undefined : image,
        likes: 3,
      });

    if (!report.trusted) {
      posted(image);
      later(700, () =>
        push({
          kind: 'reply',
          who: 'nine_lives_vc',
          text: report.unreadable ? 'thats just a black square my guy' : 'what am i even looking at',
          likes: 12,
        }),
      );
      void editorRef.current?.editor?.reset(source);
      return;
    }

    if (flags.length === 0) {
      posted(image);
      later(700, () =>
        push({ kind: 'reply', who: 'nine_lives_vc', text: 'bro what did you even do 😐', likes: 41 }),
      );
      void editorRef.current?.editor?.reset(source);
      return;
    }

    // a post nobody believes changes nothing, no matter what it removed
    if (broken.length > 0) {
      posted(image);
      later(700, () =>
        push({ kind: 'reply', who: 'marla_qt', text: `${broken[0].why}. this could be anywhere.`, likes: 88 }),
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
    const printed = renderLevel(level, after);
    posted(printed);

    // hold the saved file over the street, then let it resolve into what the
    // world made of it. Two frames apart, so the transition actually runs
    setSentShot(image);
    setFading(false);
    later(80, () => setFading(true));
    later(2200, () => {
      setSentShot(null);
      setFading(false);
    });

    level.flags
      .filter((f) => flags.includes(f.name))
      .forEach((f, i) =>
        later(500 + i * 450, () =>
          push({ kind: 'system', who: '', text: f.says.toUpperCase(), likes: 0 }),
        ),
      );

    // people comment on what they can see, so the replies come from the flags that
    // actually landed. One ambient line goes in the mix as noise
    const said = level.flags
      .filter((f) => flags.includes(f.name))
      .flatMap((f) => f.chatter);
    const picks = said.sort(() => Math.random() - 0.5).slice(0, 2);
    // the ambient pool and a flag's own lines overlap, so two people could end up
    // saying the same sentence word for word
    const noise = level.reactions
      .filter((t) => !picks.includes(t))
      .sort(() => Math.random() - 0.5)
      .slice(0, 1);
    const crowd = Array.from(new Set([...picks, ...noise]));
    crowd.forEach((text, i) =>
      later(1200 + i * 900, () => {
        play('reply');
        push({
          kind: 'reply',
          who: ['nine_lives_vc', 'marla_qt', 'boardwalk_dan', 'leonida_lurker'][i % 4],
          text,
          likes: 4 + i * 11,
        });
      }),
    );

    const hits: Tell[] = spotted(level, report, after);
    const fatal = hits.find((t) => t.fatal);
    if (hits.length > 0 || smell.total > level.tolerance) {
      const tell = hits[0];
      const zone = tell ? level.zones[tell.zone] : level.zones[Object.keys(level.zones)[0]];
      const text = tell
        ? tell.post
        : `something about this is off. ${smell.notes[0]?.note ?? 'it does not sit right'}.`;
      later(3600, () => {
        play('sting');
        push({
          kind: 'him',
          who: HIM,
          text,
          likes: 210,
          ...(tell?.whole
            ? { image }
            : { zoom: { image, zone } }),
        });
      });
      if (fatal?.reverts) {
        later(5200, () => {
          play('revert');
          const back = stuck.filter((f) => f !== fatal.reverts);
          const held =
            level.choice && fatal.reverts === level.choice.when ? null : picked ?? choice;
          setEarned(back);
          if (level.choice && fatal.reverts === level.choice.when) setChoice(null);
          show(back, held);
          push({ kind: 'system', who: '', text: 'PEOPLE BELIEVED HIM. IT WENT BACK.', likes: 0 });
          setNotice({
            head: 'It went back',
            body:
              fatal.fix ??
              'He was believed, so the street undid it. Try it a way he cannot catch.',
          });
          later(7000, () => setNotice(null));
        });
      }
    }

    // the notice explains why the workspace photo is different. The job-done card
    // says the same thing louder, so it only runs when the job is still open
    const landed = level.solved(after) && !fatal;
    if (!landed) {
      setNotice({
        head: 'The street changed',
        body: 'Your pixels were only the instruction. This is what Leonida printed.',
      });
      later(5600, () => setNotice(null));
    }
    if (landed && !beat) {
      setBeat(true);
      later(400, () => play('landed'));
      chapter.payoff.forEach((m, i) =>
        later(2400 + i * 1300, () => setThread((prev) => [...prev, m])),
      );
      later(6400, () => {
        play('sting');
        setHisBeat(chapter.himClosing);
        push({ kind: 'him', who: HIM, text: chapter.himClosing, likes: 180 });
      });
      // the card used to cover the screen the instant the world moved, hiding the
      // street changing, the client's reply and his closing line along with it
      later(10200, () => {
        setHisBeat(null);
        setFinale(true);
      });
    }

    void editorRef.current?.editor?.reset(printed);
  }

  async function readPost(dataUrl: string) {
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
    const root = document.querySelector('.editor-shell .image-editor-root');
    const commit = Array.from(root?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Save',
    );
    if (commit) {
      (commit as HTMLButtonElement).click();
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

  const heat = Math.min(1, suspicion / level.tolerance);
  const segments = 12;
  const lit = Math.round(heat * segments);

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
          <span className="text-mute">Job {String(level.id).padStart(2, '0')}</span>{' '}
          {level.title}
        </h1>
        <span className="hidden truncate text-[10px] tracking-[0.14em] text-dim lg:block">
          NEW TOOL — {level.teaches.toUpperCase()}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] tracking-[0.16em] text-mute">SUSPICION</span>
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
          <button
            onClick={() => {
              const next = !sound;
              setSound(next);
              setMuted(!next);
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

          {/* The swap is the game, so it is shown rather than hidden. Side by side:
              the file the player saved, and the photograph the street printed from
              it. Without this the picture simply changes under them and reads as
              their work being thrown away. */}
          {notice && (
            <div
              data-testid="world-changed"
              className="rise pointer-events-none absolute left-1/2 top-4 z-30 w-[min(34rem,92%)] -translate-x-1/2 border border-accent bg-ink/95 px-4 py-2 text-center"
            >
              <p className="eyebrow text-xs text-accent">{notice.head}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-text/80">{notice.body}</p>
            </div>
          )}

          {/* ----------------------------------------------------- action row */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
            <span className="text-[10px] tracking-[0.14em] text-dim">
              ZOOM {previewsLeft}
            </span>
            {Object.keys(level.zones).map((z) => (
              <button
                key={z}
                data-testid={`preview-${z}`}
                onClick={() => void runPreview(z)}
                disabled={previewsLeft <= 0 || busy}
                className="border border-line px-2 py-1 text-[10px] text-mute hover:border-mute hover:text-text disabled:opacity-30"
              >
                {z.replace(/_/g, ' ')}
              </button>
            ))}

            <button
              onClick={() => void editorRef.current?.editor?.reset(source)}
              className="eyebrow ml-auto border border-line px-4 py-2 text-[11px] text-mute hover:border-accent hover:text-text"
            >
              Reset
            </button>
            <button
              data-testid="post-it"
              onClick={() => void postIt()}
              disabled={busy}
              className="display bg-accent px-7 py-2 text-lg text-accent-ink hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Reading…' : 'Post it'}
            </button>
          </div>
        </section>

        {/* ----------------------------------------------------------- right rail */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-line xl:w-[450px]">
          {/* the street stays pinned: it is the payoff, and watching it change is
              the whole point of the game */}
          <div className="shrink-0 border-b border-line">
            <div className="flex items-baseline justify-between px-3 pt-2.5">
              <h2 className="eyebrow text-xs text-text">The street</h2>
              <span className="text-[10px] tracking-[0.14em] text-accent">LIVE</span>
            </div>
            <div className="p-3 pt-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-testid="world"
                  src={source}
                  alt="the world as it is now"
                  className="w-full border border-line"
                />
                {sentShot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    data-testid="dissolve"
                    src={sentShot}
                    alt=""
                    className={`absolute inset-0 h-full w-full border border-accent transition-opacity duration-[1400ms] ease-out ${
                      fading ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                )}
              </div>
              {sentShot && (
                <p className="eyebrow mt-1.5 text-center text-[9px] text-accent">
                  what you sent &rarr; what the street printed
                </p>
              )}
            </div>
          </div>

          {/* what this job still needs. Without it, a player who does half the job
              has no way of telling which half is missing */}
          <div className="shrink-0 border-b border-line px-3 py-2.5">
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
            <p className="mt-2 text-[10px] text-dim">
              KEEP IN SHOT: {level.keeps.map((k) => k.zone.replace(/_/g, ' ')).join(', ')}
            </p>

            {/* working out which manipulation solves it is the game, so the hints
                sit behind a button and come one at a time. Once read they fold
                away, because three of them push the client and the feed off the
                bottom of the panel */}
            {hints > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                <span className="eyebrow text-[10px] text-mute">
                  Hints {hints}/{level.hints.length}
                </span>
                <button
                  data-testid="hint-fold"
                  onClick={() => setHintsOpen((v) => !v)}
                  className="eyebrow text-[10px] text-accent hover:text-text"
                >
                  {hintsOpen ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
            <div
              className={
                hintsOpen && hints > 0 ? 'max-h-52 overflow-y-auto scroll-thin' : undefined
              }
            >
              {hintsOpen &&
                level.hints.slice(0, hints).map((h, i) => (
                  <p
                    key={h.slice(0, 14)}
                    data-testid="hint"
                    className="rise mt-2 border-l-2 border-accent bg-raised px-2 py-1.5 text-[11px] leading-snug text-text/85"
                  >
                    <span className="text-accent">{i + 1}. </span>
                    {h}
                  </p>
                ))}
            </div>
            {hints < level.hints.length && (
              <button
                data-testid="hint-button"
                onClick={() => {
                  setHints((n) => n + 1);
                  setHintsOpen(true);
                }}
                className="eyebrow mt-2 w-full border border-line py-1.5 text-[10px] text-mute hover:border-accent hover:text-text"
              >
                {hints === 0 ? 'Stuck? Get a hint' : `Another hint  ${hints}/${level.hints.length}`}
              </button>
            )}
          </div>

          {/* client and feed share the rest of the height, one at a time */}
          <div className="flex shrink-0 border-b border-line">
            {(['client', 'feed'] as const).map((tab) => (
              <button
                key={tab}
                data-testid={`tab-${tab}`}
                onClick={() => {
                  setRail(tab);
                  if (tab === 'feed') setUnread(0);
                }}
                className={`eyebrow flex-1 px-3 py-2 text-[11px] ${
                  rail === tab
                    ? 'bg-accent text-accent-ink'
                    : 'text-mute hover:text-text'
                }`}
              >
                {tab === 'client' ? 'Client' : 'Feed'}
                {tab === 'feed' && unread > 0 && rail !== 'feed' && (
                  <span className="ml-1.5 bg-accent px-1 text-[10px] text-accent-ink">
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {rail === 'client' ? (
              <div className="flex flex-col gap-1.5">
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
                <Feed items={items} />
                <div ref={feedEnd} />
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
            className="scroll-thin max-h-full w-full max-w-lg overflow-y-auto border border-line bg-panel p-6"
          >
            <p className="eyebrow text-xs tracking-[0.2em] text-good">Job done</p>
            <h2 className="display mt-3 text-3xl text-text">{level.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-text/80">{level.epilogue}</p>

            <CaseCard done={index + 1} />

            <button
              data-testid="next-level"
              onClick={onSolved}
              className="display mt-5 w-full bg-accent py-2 text-xl text-accent-ink hover:brightness-110"
            >
              {index + 1 >= LEVELS.length ? 'See how it ends' : 'Next job'}
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

      {/* the end of a chapter belongs to him, not to the feed it would drown in */}
      {hisBeat && (
        <button
          data-testid="his-beat"
          onClick={() => {
            setHisBeat(null);
            setFinale(true);
          }}
          className="absolute inset-0 z-[55] flex cursor-pointer flex-col items-center justify-center bg-ink/95 px-8 text-center"
        >
          <p className="eyebrow text-xs tracking-[0.32em] text-accent">@{HIM}</p>
          <p className="mt-5 max-w-2xl text-[clamp(1rem,2.4vw,1.6rem)] leading-relaxed text-text">
            {hisBeat}
          </p>
          <p className="eyebrow mt-8 text-[10px] text-dim">Click to go on</p>
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

      {lastReport && (
        <details className="absolute bottom-2 left-3 z-30 max-w-md">
          <summary className="cursor-pointer text-[10px] tracking-[0.14em] text-dim">
            WHAT THE DIFF SAW
          </summary>
          <dl className="mt-1 grid grid-cols-2 gap-x-3 border border-line bg-panel p-2 text-[10px] text-mute">
            <dt className="text-dim">brightness</dt>
            <dd data-testid="gain">{lastReport.gain.toFixed(3)}×</dd>
            <dt className="text-dim">saved size</dt>
            <dd>
              {lastReport.dims.saved[0]}×{lastReport.dims.saved[1]}
            </dd>
            <dt className="text-dim">rotation / fit</dt>
            <dd>
              {lastReport.alignment.rotation}° / {lastReport.alignment.score.toFixed(3)}
            </dd>
            {Object.entries(lastReport.zones).map(([name, z]) => (
              <ZoneRow key={name} name={name} z={z} />
            ))}
          </dl>
        </details>
      )}
    </main>
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
        {z.missing.toFixed(2)} gone / {z.structure.toFixed(2)} changed /{' '}
        {z.drift.toFixed(3)} drift
      </dd>
    </>
  );
}
