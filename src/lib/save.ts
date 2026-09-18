/**
 * How many jobs are behind you, kept between visits.
 *
 * The only thing worth saving is that number. Everything else — the flags on a
 * job, the feed, the suspicion bar — belongs to the job you are in and is meant
 * to be lost when you leave it.
 *
 * Every call is wrapped. localStorage throws outright in a private window with
 * site data blocked, and a judge opening the link in one should get the game from
 * the beginning, not a blank screen.
 */

const KEY = 'posted.jobs-done';

export function loadDone(total: number): number {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return 0;
    // a stale save from a build with fewer jobs must not point past the end
    return Math.min(Math.max(n, 0), total);
  } catch {
    return 0;
  }
}

export function saveDone(n: number): void {
  try {
    window.localStorage.setItem(KEY, String(n));
  } catch {
    // no storage, no save. The session still plays through normally
  }
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear if there was nowhere to write
  }
}
