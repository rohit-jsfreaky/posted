/**
 * Four sounds, synthesised. No audio files to download, nothing to license.
 *
 * Everything is short, quiet and built from one oscillator and one gain ramp, so
 * it sits under the game instead of on top of it. The context is created on the
 * first play rather than at import, because browsers will not start audio until
 * the player has actually clicked something — and the first sound here always
 * follows a click on Save.
 *
 * Every call is wrapped: a browser that refuses audio should cost the player
 * nothing, so failures are swallowed rather than surfaced.
 */

export type Cue = 'post' | 'reply' | 'sting' | 'revert' | 'landed';

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
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
};

export function play(cue: Cue) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  try {
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
      osc.connect(amp).connect(ac.destination);
      osc.start(start);
      osc.stop(start + v.seconds + 0.05);
    });
  } catch {
    // a browser that will not make noise is not a reason to stop the game
  }
}

export function setMuted(next: boolean) {
  muted = next;
}

export function isMuted(): boolean {
  return muted;
}
