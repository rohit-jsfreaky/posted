'use client';

import { useEffect, useRef } from 'react';
import { MAIN } from '@/lib/levels';
import { renderLevel } from '@/lib/level';

/**
 * The whole game, behind the title, in eight seconds and without a word.
 *
 * Somebody landing on the menu cold has no idea what this is. The one-liner says
 * "whatever you post becomes true", which reads as a slogan until you have seen
 * it happen — so it happens, on a loop, behind the menu: the door photograph, a
 * crop frame closing past the man standing on it, the light going, and the
 * street coming back without him.
 *
 * It is the first job of the game played by nobody, and it is drawn from exactly
 * the same authored art the game composites, so it cannot drift from what the
 * player is about to do. Nothing here touches the editor. The crop frame and the
 * slider are drawn — they are a picture of an edit, not an edit.
 *
 * Runs on one `requestAnimationFrame` loop, stops itself when the tab is hidden,
 * and falls back to a single still frame for anybody who has asked their machine
 * to stop moving things.
 */

/**
 * The timeline, in seconds, each number the moment that beat starts.
 *
 * Weighted toward the end on purpose. The setup is only there to make the last
 * beat mean something, so the street being different is what holds — three
 * seconds of it against one of the edit that caused it.
 */
const BEAT = {
  hold: 0,
  frame: 0.8,
  drag: 1.1,
  dim: 2.6,
  post: 3.5,
  develop: 3.8,
  settle: 5.2,
  end: 8.2,
} as const;

/** where the frame stops: just inside the man on the door */
const CROP_TO = 0.7;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** 0 before `from`, 1 after `to`, eased between */
const span = (t: number, from: number, to: number) => ease(clamp01((t - from) / (to - from)));

export default function ColdOpen({ className = '' }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const level = MAIN[0];
    // the two ends of the first job, composited from the same art the game uses
    const before = new Image();
    const after = new Image();
    before.src = renderLevel(level, level.initial);
    after.src = renderLevel(level, level.apply(level.initial, ['night', 'bouncer_removed']));

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    let stopped = false;
    /**
     * One fixed epoch rather than a frame-relative start.
     *
     * Resetting the clock whenever the tab came back made the loop jump, and it
     * made the thing impossible to reason about: two screenshots four seconds
     * apart could land on the same beat.
     */
    const epoch = performance.now();

    /** cover-fit, because the menu sits over this and letterboxing would show */
    function cover(img: HTMLImageElement, w: number, h: number) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
    }

    function frame(now: number) {
      if (stopped) return;
      const el = canvas.current;
      if (!el || !ctx) return;

      // match the backing store to the box it is actually drawn in
      const box = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr;
        el.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = still ? BEAT.settle + 0.4 : ((now - epoch) / 1000) % BEAT.end;

      ctx.clearRect(0, 0, w, h);
      if (!before.complete || !after.complete) {
        raf = requestAnimationFrame(frame);
        return;
      }

      const fit = cover(before, w, h);
      // where the frame's right edge is, in screen pixels
      const cut = span(t, BEAT.drag, BEAT.dim);
      const edge = fit.x + fit.w * (1 - (1 - CROP_TO) * cut);
      // the light going out of it
      const dark = span(t, BEAT.dim, BEAT.post) * 0.55;

      ctx.drawImage(before, fit.x, fit.y, fit.w, fit.h);
      if (dark > 0) {
        ctx.fillStyle = `rgba(8, 10, 24, ${dark})`;
        ctx.fillRect(0, 0, w, h);
      }

      // everything outside the frame is on its way out of the photograph
      if (t > BEAT.frame && t < BEAT.develop) {
        const showing = span(t, BEAT.frame, BEAT.frame + 0.35);
        ctx.save();
        ctx.globalAlpha = showing;
        ctx.fillStyle = 'rgba(8, 8, 10, 0.62)';
        ctx.fillRect(edge, 0, w - edge, h);

        ctx.strokeStyle = '#ff2e7e';
        ctx.lineWidth = 2;
        ctx.strokeRect(fit.x + 8, fit.y + 8, edge - fit.x - 16, fit.h - 16);

        // one handle, on the edge that is doing the work
        ctx.fillStyle = '#ff2e7e';
        ctx.fillRect(edge - 5, fit.y + fit.h / 2 - 16, 10, 32);
        ctx.restore();
      }

      // the shutter, for the fraction of a second the post takes
      if (t >= BEAT.post && t < BEAT.develop) {
        const flash = 1 - clamp01((t - BEAT.post) / (BEAT.develop - BEAT.post));
        ctx.fillStyle = `rgba(255, 46, 126, ${flash * 0.5})`;
        ctx.fillRect(0, 0, w, h);
      }

      // the street, printed over the photograph that asked for it
      if (t >= BEAT.develop) {
        const wipe = span(t, BEAT.develop, BEAT.settle);
        const af = cover(after, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h * wipe);
        ctx.clip();
        ctx.drawImage(after, af.x, af.y, af.w, af.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    // a loop nobody is looking at is a loop nobody should be paying for
    const onVisible = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className={className} />;
}
