/**
 * The file Leonida is building on the player.
 *
 * The last job in the game is dressing a photograph up as a police file. This is
 * the same trick turned around: finish a job and the city opens one on you. The
 * rank goes up each time, and after all five there is only one thing left to
 * call you.
 *
 * Drawn on a canvas at share size so it can be saved and posted. It uses the
 * same rules as the interface — flat colour, hairlines, one accent, heavy
 * condensed type for anything that shouts — because a reward that looks like it
 * came from a different product is not a reward.
 */

import { STAMP, type Band } from './heat';
import { caseNumber, type Identity } from './identity';

export const CARD_W = 1200;
export const CARD_H = 630;

const INK = '#08080a';
const PANEL = '#0e0e11';
const LINE = '#24242a';
const TEXT = '#f2f2f4';
const MUTE = '#86868f';
const DIM = '#55555e';
const ACCENT = '#ff2e7e';
const GOOD = '#46e0a0';

/**
 * What the city is prepared to call you.
 *
 * The first five come from the run, one per story job. The last one is not on
 * that ladder at all: it is for somebody who finished the run *and* took every
 * job going on the side, which is a different kind of person from somebody who
 * simply got to the end.
 */
export const RANKS = [
  {
    title: 'Person of interest',
    line: 'One photograph, and nobody checked a single thing about it.',
  },
  {
    title: 'Known associate',
    line: 'Two now. Somebody has started keeping the originals.',
  },
  {
    title: 'Suspect',
    line: 'Three. Same hand on all of them, and he can prove it.',
  },
  {
    title: 'Wanted',
    line: 'Four. He knows it is you. He put himself in one of them.',
  },
  {
    title: 'Public enemy',
    line: 'Five. He was right about every single one, and nobody listened.',
  },
];

export const MENACE = {
  title: 'Absolute menace',
  line: 'The run, and every job going on the side. Nothing here is a photograph now.',
};

/** Which one applies, given the run and the side work. */
export function rankFor(main: number, side: number, sideTotal: number) {
  if (main >= RANKS.length && sideTotal > 0 && side >= sideTotal) return MENACE;
  return RANKS[Math.min(Math.max(main, 1), RANKS.length) - 1];
}

/** Short enough to sit in a row of five. */
const JOBS = ['Door', 'Car', 'Reflection', 'Lot', 'File'];

export type CardFonts = { display: string; mono: string };

/**
 * The font families actually in use.
 *
 * next/font rewrites the family name at build time, so the card asks the page
 * what it ended up being rather than guessing. Falls back to something sane if
 * the element is not there.
 */
export function readFonts(el: HTMLElement | null): CardFonts {
  const fallback = { display: 'sans-serif', mono: 'monospace' };
  if (!el) return fallback;
  const style = window.getComputedStyle(el);
  return {
    display: style.getPropertyValue('--font-display')?.trim() || fallback.display,
    mono: style.getPropertyValue('--font-mono')?.trim() || fallback.mono,
  };
}

type Ctx = CanvasRenderingContext2D;

/**
 * Shrink until it fits, rather than running off the edge of the card.
 *
 * `floor` has to be given for anything that starts small. It used to be fixed at
 * 20, which meant the one-line summary — set at 17 — was already under the floor
 * and never shrank at all, so a long one simply ran off the right-hand edge.
 */
function fitted(
  ctx: Ctx,
  text: string,
  family: string,
  start: number,
  room: number,
  floor = 20,
): number {
  let size = start;
  for (;;) {
    ctx.font = `700 ${size}px ${family}`;
    if (ctx.measureText(text).width <= room || size <= floor) return size;
    size -= 1;
  }
}

function hairline(ctx: Ctx, x: number, y: number, w: number, colour = LINE) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, 1);
}

/** The photograph, or an honest admission that there is not one. */
function drawPhoto(ctx: Ctx, img: HTMLImageElement | null, id: Identity, f: CardFonts) {
  const x = 64;
  const y = 150;
  const s = 250;

  ctx.fillStyle = PANEL;
  ctx.fillRect(x, y, s, s);

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, s, s);
    ctx.clip();
    // cover, so a non-square avatar is not squashed
    const scale = Math.max(s / img.naturalWidth, s / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h);
    ctx.restore();
  } else {
    // An anonymous subject has no photograph on file, and saying so is truer to
    // the fiction than inventing a face for them.
    const initials = id.handle.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '??';
    ctx.fillStyle = ACCENT;
    ctx.font = `700 ${fitted(ctx, initials, f.display, 120, s - 40)}px ${f.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, x + s / 2, y + s / 2 - 10);
    ctx.fillStyle = DIM;
    ctx.font = `600 14px ${f.mono}`;
    ctx.fillText('NO PHOTO ON FILE', x + s / 2, y + s - 28);
  }

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = MUTE;
  ctx.font = `600 15px ${f.mono}`;
  ctx.fillText(`@${id.handle}`, x, y + s + 28);
}

/** The run, and a tally of the work taken on the side. */
function drawJobs(
  ctx: Ctx,
  progress: { main: number; side: number; sideTotal: number },
  f: CardFonts,
) {
  const done = progress.main;
  const x = 64;
  const y = 470;
  const w = CARD_W - 128;
  const cell = w / JOBS.length;

  hairline(ctx, x, y - 26, w);
  ctx.textBaseline = 'middle';

  JOBS.forEach((job, i) => {
    const cx = x + cell * i;
    const on = i < done;
    ctx.fillStyle = on ? GOOD : LINE;
    ctx.fillRect(cx, y, 18, 18);
    if (on) {
      ctx.fillStyle = INK;
      ctx.font = `700 13px ${f.mono}`;
      ctx.textAlign = 'center';
      ctx.fillText('✓', cx + 9, y + 10);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = on ? TEXT : DIM;
    ctx.font = `600 14px ${f.mono}`;
    ctx.fillText(job.toUpperCase(), cx + 26, y + 10);
  });

  if (progress.sideTotal > 0) {
    const all = progress.side >= progress.sideTotal;
    ctx.textAlign = 'right';
    ctx.fillStyle = all ? GOOD : DIM;
    ctx.font = `600 14px ${f.mono}`;
    ctx.fillText(
      `SIDE WORK ${progress.side}/${progress.sideTotal}`,
      x + w,
      y + 10,
    );
    ctx.textAlign = 'left';
  }
  ctx.textBaseline = 'alphabetic';
}

/**
 * How much he has on you, stamped on the file the way a real one would be.
 *
 * The rank says how far you got. This says what it cost — and they are genuinely
 * independent: somebody can finish the whole run without ever giving him a thing
 * to point at, and somebody else can bulldoze the same five jobs with the paint
 * brush and reach the end with him naming them out loud.
 */
function drawStamp(ctx: Ctx, band: Band, f: CardFonts) {
  const text = STAMP[band];
  const colour = band === 'nothing' ? GOOD : ACCENT;
  ctx.font = `700 20px ${f.display}`;
  const w = ctx.measureText(text).width + 28;
  const x = CARD_W - 64 - w;
  const y = 150;

  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, 36);
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + 19);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * Draw the card and hand back a PNG data URL.
 *
 * `done` is how many jobs are finished, 1..5.
 */
export function drawCard(
  id: Identity,
  progress: { main: number; side: number; sideTotal: number },
  photo: HTMLImageElement | null,
  f: CardFonts,
  band: Band,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context not available');

  const rank = rankFor(progress.main, progress.side, progress.sideTotal);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(25, 25, CARD_W - 50, CARD_H - 50);

  // ------------------------------------------------------------- header strip
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = MUTE;
  ctx.font = `600 15px ${f.mono}`;
  ctx.fillText('VICE CITY PD · INTERNAL CIRCULATION ONLY', 64, 90);
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT;
  ctx.fillText(caseNumber(id.handle), CARD_W - 64, 90);
  hairline(ctx, 64, 110, CARD_W - 128);

  drawPhoto(ctx, photo, id, f);
  drawStamp(ctx, band, f);

  // --------------------------------------------------------------- the charge
  const left = 360;
  const room = CARD_W - left - 64;

  ctx.textAlign = 'left';
  ctx.fillStyle = MUTE;
  ctx.font = `600 14px ${f.mono}`;
  ctx.fillText('CLASSIFICATION', left, 170);

  // the cap height of the display face is about 0.72 of its size, so the baseline
  // is set from that rather than guessed — at 0.82 the letters climbed over the
  // label above them
  const title = rank.title.toUpperCase();
  const size = fitted(ctx, title, f.display, 92, room);
  const titleY = 170 + 22 + size * 0.72;
  ctx.fillStyle = TEXT;
  ctx.font = `700 ${size}px ${f.display}`;
  ctx.fillText(title, left, titleY);

  const ruleY = titleY + 26;
  ctx.fillStyle = ACCENT;
  ctx.fillRect(left, ruleY, 110, 3);

  ctx.fillStyle = TEXT;
  ctx.font = `600 ${fitted(ctx, id.name, f.mono, 26, room, 13)}px ${f.mono}`;
  ctx.fillText(id.name, left, ruleY + 44);

  ctx.fillStyle = MUTE;
  ctx.font = `600 ${fitted(ctx, rank.line, f.mono, 17, room, 11)}px ${f.mono}`;
  ctx.fillText(rank.line, left, ruleY + 78);

  drawJobs(ctx, progress, f);

  // ------------------------------------------------------------------ footer
  hairline(ctx, 64, CARD_H - 96, CARD_W - 128);
  ctx.fillStyle = DIM;
  ctx.font = `600 15px ${f.mono}`;
  ctx.fillText('In Leonida, whatever you post becomes true.', 64, CARD_H - 62);
  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT;
  ctx.font = `700 34px ${f.display}`;
  ctx.fillText('POSTED', CARD_W - 64, CARD_H - 56);

  return canvas.toDataURL('image/png');
}

/** Decode a data URL into something the canvas can draw. */
export function loadPhoto(dataUrl: string | null): Promise<HTMLImageElement | null> {
  if (!dataUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
