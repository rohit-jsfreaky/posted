/**
 * What survives a reload.
 *
 * Two numbers, really: how far through the run you are, and which side jobs you
 * have taken. Everything else — the flags on a job, the feed, the suspicion bar —
 * belongs to the job you are in and is meant to be lost when you leave it.
 *
 * Every call is wrapped. localStorage throws outright in a private window with
 * site data blocked, and a judge opening the link there should get the game from
 * the beginning rather than a blank screen.
 */

export type Progress = {
  /** how many of the five story jobs are behind you */
  main: number;
  /** the ids of the side jobs that are done, in no particular order */
  side: number[];
};

const KEY = 'posted.progress';
/** what the save was called when it was only a count of story jobs */
const OLD_KEY = 'posted.jobs-done';

export const EMPTY: Progress = { main: 0, side: [] };

export function loadProgress(mainTotal: number): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const p = parsed as Partial<Progress>;
        const main = typeof p.main === 'number' && Number.isFinite(p.main) ? p.main : 0;
        const side = Array.isArray(p.side) ? p.side.filter((n) => typeof n === 'number') : [];
        // a stale save from a build with fewer jobs must not point past the end
        return { main: Math.min(Math.max(main, 0), mainTotal), side };
      }
    }
    // somebody who played the older build keeps their place in the run
    const old = window.localStorage.getItem(OLD_KEY);
    if (old !== null) {
      const n = Number.parseInt(old, 10);
      if (Number.isFinite(n)) return { main: Math.min(Math.max(n, 0), mainTotal), side: [] };
    }
    return { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: Progress): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // no storage, no save. The session still plays through normally
  }
}

export function clearProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(OLD_KEY);
  } catch {
    // nothing to clear if there was nowhere to write
  }
}
