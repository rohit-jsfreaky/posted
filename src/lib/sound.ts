/**
 * Every sound in the game, synthesised. No files to download, nothing to license.
 *
 * Two layers. Cues are short, quiet and built from one oscillator and one gain
 * ramp, so they sit under the game instead of on top of it. Under those is a bed:
 * filtered noise and a low tone, different per scene, at about thirty decibels
 * down. It is barely audible on its own and it is the difference between a game
 * and a web page — a room you are sitting in rather than silence with beeps.
 *
 * The context is created on the first play rather than at import, because
 * browsers will not start audio until the player has clicked something.
 *
 * Every call is wrapped: a browser that refuses audio should cost the player
 * nothing, so failures are swallowed rather than surfaced.
 */

export type Cue =
  | 'post'
  | 'reply'
  | 'sting'
  | 'revert'
  | 'landed'
  /** the world developing over the file you sent */
  | 'print'
  /** the camera pushing into the thing he has found */
  | 'zoom'
  /** one line of what the street did, landing */
  | 'stamp';

/** the rooms a job can happen in, which is what the bed is made of */
export type Room = 'street' | 'water' | 'day' | 'inside' | 'neon';

let ctx: AudioContext | null = null;
let muted = false;
/** everything goes through here, so muting is one number and ducking is possible */
let master: GainNode | null = null;
let bed: { stop: () => void; gain: GainNode } | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function bus(ac: AudioContext): GainNode {
  if (!master) {
    master = ac.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ac.destination);
  }
  return master;
}

type Voice = {
  type: OscillatorType;
  from: number;
  to: number;
  seconds: number;
  gain: number;
};

const VOICES: Record<Cue, Voice[]> = {
  // a short rising push, the sound of something leaving your hands
  post: [{ type: 'triangle', from: 220, to: 520, seconds: 0.18, gain: 0.07 }],
  // somebody typing back
  reply: [{ type: 'sine', from: 660, to: 880, seconds: 0.07, gain: 0.04 }],
  // he found it. two notes falling, the lower one slower
  sting: [
    { type: 'sawtooth', from: 420, to: 150, seconds: 0.45, gain: 0.05 },
    { type: 'sine', from: 180, to: 90, seconds: 0.7, gain: 0.06 },
  ],
  // the world going back to how it was
  revert: [{ type: 'sine', from: 160, to: 70, seconds: 0.4, gain: 0.09 }],
  // the job lands
  landed: [
    { type: 'triangle', from: 440, to: 660, seconds: 0.12, gain: 0.05 },
    { type: 'triangle', from: 660, to: 880, seconds: 0.22, gain: 0.05 },
  ],
  // a long slow swell under the city printing itself
  print: [
    { type: 'sine', from: 90, to: 240, seconds: 1.2, gain: 0.05 },
    { type: 'triangle', from: 300, to: 480, seconds: 0.9, gain: 0.025 },
  ],
  // the push in: something rising and not stopping where you expect
  zoom: [{ type: 'sawtooth', from: 120, to: 600, seconds: 0.85, gain: 0.035 }],
  // one line, printed rather than typed
  stamp: [{ type: 'square', from: 900, to: 620, seconds: 0.05, gain: 0.022 }],
};

export function play(cue: Cue) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  try {
    const out = bus(ac);
    // he gets the room to himself for a moment
    if (cue === 'sting' || cue === 'zoom') duck(ac, 0.9);
    VOICES[cue].forEach((v, i) => {
      const start = ac.currentTime + i * 0.1;
      const osc = ac.createOscillator();
      const amp = ac.createGain();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.from, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.to), start + v.seconds);
      // a quick attack and a full decay, so nothing clicks at either end
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(v.gain, start + 0.015);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + v.seconds);
      osc.connect(amp).connect(out);
      osc.start(start);
      osc.stop(start + v.seconds + 0.05);
    });
  } catch {
    // a browser that will not make noise is not a reason to stop the game
  }
}

/** Pull the bed down for a moment, so a cue has somewhere to land. */
function duck(ac: AudioContext, seconds: number) {
  if (!bed) return;
  try {
    const g = bed.gain.gain;
    const now = ac.currentTime;
    const level = g.value;
    g.cancelScheduledValues(now);
    g.setValueAtTime(level, now);
    g.linearRampToValueAtTime(level * 0.35, now + 0.08);
    g.linearRampToValueAtTime(level, now + seconds);
  } catch {
    // ducking is a nicety, not a feature
  }
}

/** How each room sounds when nothing is happening in it. */
const ROOMS: Record<Room, { hz: number; tone: number; gain: number; q: number }> = {
  /** a street at two in the morning: traffic a long way off */
  street: { hz: 220, tone: 58, gain: 0.05, q: 0.6 },
  /** water moving against a dock, which is mostly high and soft */
  water: { hz: 760, tone: 48, gain: 0.042, q: 0.4 },
  /** an open lot in the afternoon. Air, and not much else */
  day: { hz: 420, tone: 74, gain: 0.032, q: 0.5 },
  /** a room with the door shut. Almost all of it is the building itself */
  inside: { hz: 140, tone: 52, gain: 0.055, q: 1.1 },
  /** rain on a lit street, brighter and busier than the rest */
  neon: { hz: 1100, tone: 64, gain: 0.05, q: 0.35 },
};

/**
 * Start the room.
 *
 * Noise through a band-pass, plus one low oscillator for weight. Two seconds of
 * noise on a loop is enough that nobody hears it repeat, and generating it costs
 * about a millisecond.
 */
export function startBed(room: Room) {
  stopBed();
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  try {
    const spec = ROOMS[room];
    const seconds = 2;
    const buffer = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = spec.hz;
    band.Q.value = spec.q;

    const tone = ac.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = spec.tone;
    const toneGain = ac.createGain();
    toneGain.gain.value = 0.35;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    // fade in, because a room that arrives all at once is a sound effect
    gain.gain.exponentialRampToValueAtTime(spec.gain, ac.currentTime + 1.6);

    noise.connect(band).connect(gain);
    tone.connect(toneGain).connect(gain);
    gain.connect(bus(ac));
    noise.start();
    tone.start();

    bed = {
      gain,
      stop: () => {
        try {
          const now = ac.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
          noise.stop(now + 0.45);
          tone.stop(now + 0.45);
        } catch {
          // already gone
        }
      },
    };
  } catch {
    // no room tone, no problem
  }
}

export function stopBed() {
  bed?.stop();
  bed = null;
}

export function setMuted(next: boolean) {
  muted = next;
  if (next) stopBed();
  try {
    if (master && ctx) {
      master.gain.setValueAtTime(next ? 0 : 1, ctx.currentTime);
    }
  } catch {
    // the flag alone is enough to keep everything quiet
  }
}

export function isMuted(): boolean {
  return muted;
}
