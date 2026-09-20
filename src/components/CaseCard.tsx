'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CARD_H, CARD_W, drawCard, loadPhoto, readFonts, RANKS } from '@/lib/card';
import {
  anonymousIdentity,
  loadIdentity,
  lookupGithub,
  saveIdentity,
  type Identity,
} from '@/lib/identity';

/**
 * The file the city opened on you, and the button that saves it.
 *
 * It lives inside the job-done screen rather than in a modal of its own —
 * stacking a second dialog on top of the first is how a reward starts feeling
 * like an interruption.
 *
 * The first time through it asks who the file should be about. Answering is
 * optional and always has been: an anonymous forger with no photograph on file
 * is a perfectly good card, and the game says so rather than nagging.
 */
export default function CaseCard({ done }: { done: number }) {
  /**
   * Read straight off the device, not in an effect.
   *
   * This only ever mounts inside the job-done screen, which cannot exist until
   * somebody has played a job, so there is no server render for it to disagree
   * with. `loadIdentity` swallows a missing `window` anyway.
   */
  const [id, setId] = useState<Identity | null>(() => loadIdentity());
  const [typed, setTyped] = useState('');
  const [looking, setLooking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const probe = useRef<HTMLDivElement>(null);

  const make = useCallback(async (who: Identity) => {
    // the display face is loaded by next/font and may not be ready on the first
    // frame; drawing before it is would fall back to a system face
    try {
      await document.fonts.ready;
    } catch {
      // no font loading API, draw with whatever is resolved
    }
    const photo = await loadPhoto(who.photo);
    setCard(drawCard(who, done, photo, readFonts(probe.current)));
  }, [done]);

  useEffect(() => {
    if (id) void make(id);
  }, [id, make]);

  async function claim() {
    setLooking(true);
    setProblem(null);
    try {
      const found = await lookupGithub(typed);
      saveIdentity(found);
      setId(found);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setLooking(false);
    }
  }

  function stayAnonymous() {
    const alias = anonymousIdentity();
    saveIdentity(alias);
    setId(alias);
  }

  const rank = RANKS[Math.min(Math.max(done, 1), RANKS.length) - 1];

  return (
    <div className="mt-5 border-t border-line pt-4">
      {/* the card is drawn with the page's own faces, read off this element */}
      <div ref={probe} className="hidden" />

      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-xs text-accent">The file on you</p>
        <p className="eyebrow text-[10px] text-dim">
          {done}/{RANKS.length} · {rank.title}
        </p>
      </div>

      {!id ? (
        <>
          <p className="mt-2 text-xs leading-snug text-mute">
            Leonida has opened a file. It needs a name and a photograph. Give it
            your GitHub, or stay anonymous — a forger with no photo on file is the
            more honest card anyway.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              data-testid="gh-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typed.trim() && !looking) void claim();
              }}
              placeholder="github.com/yourname"
              className="min-w-0 flex-1 border border-line bg-ink px-3 py-2 text-xs text-text placeholder:text-dim focus:border-accent focus:outline-none"
            />
            <button
              data-testid="gh-claim"
              onClick={() => void claim()}
              disabled={!typed.trim() || looking}
              className="eyebrow shrink-0 bg-accent px-4 text-[10px] text-accent-ink disabled:bg-line disabled:text-dim"
            >
              {looking ? 'Looking' : 'Use this'}
            </button>
            <button
              data-testid="gh-skip"
              onClick={stayAnonymous}
              disabled={looking}
              className="eyebrow shrink-0 border border-line px-4 text-[10px] text-mute hover:border-accent hover:text-text"
            >
              Stay anonymous
            </button>
          </div>
          {problem && <p className="mt-2 text-[11px] text-accent">{problem}</p>}
        </>
      ) : card ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="case-card"
            src={card}
            alt={`${rank.title}: the file on you`}
            width={CARD_W}
            height={CARD_H}
            className="mt-3 w-full border border-line"
          />
          <a
            data-testid="card-download"
            href={card}
            download={`posted-${rank.title.toLowerCase().replace(/\s+/g, '-')}.png`}
            className="eyebrow mt-3 block bg-accent py-2 text-center text-xs text-accent-ink hover:brightness-110"
          >
            Save the file
          </a>
        </>
      ) : (
        <p className="mt-3 text-[11px] text-dim">Opening the file…</p>
      )}
    </div>
  );
}
