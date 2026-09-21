/**
 * What he has on you, kept between jobs.
 *
 * The arc says he digs up your older posts and puts all three side by side. The
 * game did not let him: every post he made was thrown away the moment you left
 * the job, so the one character in the field with a memory had none. By job
 * three he was saying "same hand on all three" with nothing to show for it.
 *
 * So his posts are kept. Not the feed — the feed belongs to the job it happened
 * in and is meant to be lost — just his, with the job it came from and a small
 * copy of the file he was pointing at. It reads as a folder somebody has been
 * building, because that is exactly what it is.
 *
 * Kept small on purpose: a 240px JPEG of a photograph nobody will ever zoom into
 * again, capped at two dozen entries. localStorage is a few megabytes and losing
 * the whole save because his thread filled it would be a ridiculous way to lose
 * a run.
 */

import type { Zone } from './zones';

export type HisPost = {
  /** what the job was called when he posted it: "Job 02", "Side job" */
  job: string;
  title: string;
  text: string;
  /** a small copy of the file you sent, if he was pointing at one */
  shot?: string;
  /** where he was pointing, if anywhere */
  zone?: Zone;
};

const KEY = 'posted.thread';
const CAP = 24;

export function loadThread(): HisPost[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is HisPost =>
        typeof p === 'object' && p !== null && typeof (p as HisPost).text === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Add one, and say what the thread looks like now.
 *
 * Returns the new list rather than nothing, so the interface can show it without
 * reading storage back — and so a browser that refuses to write still shows the
 * right thing for the rest of the session.
 */
export function remember(post: HisPost): HisPost[] {
  const next = [...loadThread(), post].slice(-CAP);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // out of room, or no room at all. The run carries on either way
  }
  return next;
}

export function clearThread(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear if there was nowhere to write
  }
}

/**
 * Shrink a saved photograph down to something worth keeping.
 *
 * The files handed around in play are full-size PNGs, which are megabytes each.
 * This is a thumbnail in a thread, so it goes to 240px and JPEG — and if the
 * decode fails for any reason the caller gets nothing rather than an exception
 * in the middle of a sequence.
 */
export async function thumbnail(dataUrl: string, width = 240): Promise<string | undefined> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('could not decode'));
      el.src = dataUrl;
    });
    const scale = Math.min(1, width / (img.naturalWidth || width));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return undefined;
  }
}
