/**
 * Who the file is about.
 *
 * The last job in the game is making a police file about somebody else. The
 * reward for finishing a job is the file Leonida is quietly building about you,
 * so it needs a name and a photograph to put on it. The player can hand over a
 * GitHub profile, or stay anonymous and be given a working alias — which is what
 * a forger would actually have.
 *
 * The lookup is the only network call in the whole game, it is opt-in, and it
 * fails quietly into the anonymous path. Nothing else here touches the network.
 */

export type Identity = {
  /** what goes on the NAME line */
  name: string;
  /** the handle, without the @ */
  handle: string;
  /**
   * The avatar as a data URL, so the card can be drawn and downloaded.
   *
   * It has to be a data URL rather than the remote address: drawing a
   * cross-origin image straight onto a canvas taints it, and a tainted canvas
   * refuses to hand back a file. Fetching the bytes and going through a blob
   * keeps the canvas clean. Null means nobody supplied a photograph.
   */
  photo: string | null;
  /** true when this was assigned rather than claimed */
  anonymous: boolean;
};

const KEY = 'posted.identity';

/** Handles for somebody who would rather not say. */
const ALIASES = [
  'quiet_hands',
  'no_name_given',
  'the_retoucher',
  'file_not_found',
  'never_worked_here',
  'leonida_ghost',
  'second_pass',
  'clean_plate',
];

/**
 * None of these guess anything about the person holding the keyboard.
 *
 * "Unknown male" and "Unknown female" read like a real police file, which is why
 * they were here, but the file is about the player and a coin flip on somebody's
 * gender is not a detail worth the flavour.
 */
const ALIAS_NAMES = [
  'Name withheld',
  'Not on file',
  'No name given',
  'Subject declined',
  'Identity unconfirmed',
  'Refused to sit',
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * A username out of whatever the player pasted.
 *
 * People paste the profile URL, the URL with a trailing slash, `@handle`, or
 * just the handle. All four mean the same thing.
 */
export function parseHandle(input: string): string | null {
  const raw = input.trim().replace(/^@/, '');
  if (!raw) return null;
  const fromUrl = raw.match(/github\.com\/([A-Za-z0-9-]+)/i);
  const handle = fromUrl ? fromUrl[1] : raw;
  return /^[A-Za-z0-9-]{1,39}$/.test(handle) ? handle : null;
}

async function photoOf(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Look somebody up. Throws only so the caller can say what went wrong. */
export async function lookupGithub(input: string): Promise<Identity> {
  const handle = parseHandle(input);
  if (!handle) throw new Error('That does not look like a GitHub profile.');

  const res = await fetch(`https://api.github.com/users/${handle}`);
  if (res.status === 404) throw new Error(`No GitHub user called ${handle}.`);
  if (!res.ok) throw new Error('GitHub did not answer. Try again, or stay anonymous.');

  const body: { login?: string; name?: string | null; avatar_url?: string } = await res.json();
  const login = body.login ?? handle;
  return {
    name: body.name?.trim() || login,
    handle: login,
    photo: body.avatar_url ? await photoOf(body.avatar_url) : null,
    anonymous: false,
  };
}

export function anonymousIdentity(): Identity {
  return { name: pick(ALIAS_NAMES), handle: pick(ALIASES), photo: null, anonymous: true };
}

/**
 * The case number on the file.
 *
 * Seven digits, because that is the rule Level 5 makes the player learn, and it
 * is the same number every time for the same handle.
 */
export function caseNumber(handle: string): string {
  let n = 0;
  for (let i = 0; i < handle.length; i++) n = (n * 31 + handle.charCodeAt(i)) >>> 0;
  return `VCPD-${String(n % 10_000_000).padStart(7, '0')}`;
}

export function loadIdentity(): Identity | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const id = parsed as Partial<Identity>;
    if (typeof id.name !== 'string' || typeof id.handle !== 'string') return null;
    return {
      name: id.name,
      handle: id.handle,
      photo: typeof id.photo === 'string' ? id.photo : null,
      anonymous: id.anonymous === true,
    };
  } catch {
    return null;
  }
}

export function saveIdentity(id: Identity): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(id));
  } catch {
    // a photograph can be large enough to fill the quota, and an identity that
    // does not survive a reload is still fine for the session it was made in
  }
}

export function clearIdentity(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear if there was nowhere to write
  }
}
