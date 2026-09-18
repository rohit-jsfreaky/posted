/**
 * Grey-box drawing helpers.
 *
 * Every scene in the game is built from these until the real art lands in Phase 4.
 * Everything takes fractional coordinates so the scenes and the zones speak the
 * same language.
 */

import type { Zone } from './zones';

export const SCENE_W = 1200;
export const SCENE_H = 800;

export type Ctx = CanvasRenderingContext2D;

export function fill(ctx: Ctx, z: Zone, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(z.x * ctx.canvas.width, z.y * ctx.canvas.height, z.w * ctx.canvas.width, z.h * ctx.canvas.height);
}

export function circle(ctx: Ctx, cx: number, cy: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx * ctx.canvas.width, cy * ctx.canvas.height, r * ctx.canvas.width, 0, Math.PI * 2);
  ctx.fill();
}

export function label(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  colour: string,
  size = 20,
  align: CanvasTextAlign = 'center',
) {
  ctx.fillStyle = colour;
  ctx.font = `600 ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x * ctx.canvas.width, y * ctx.canvas.height);
}

/** A person: body block plus a head, so removing one is visibly removing someone. */
export function person(ctx: Ctx, z: Zone, colour: string, name?: string) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.fillStyle = colour;
  ctx.fillRect(z.x * W, (z.y + z.h * 0.22) * H, z.w * W, z.h * 0.78 * H);
  ctx.beginPath();
  ctx.arc((z.x + z.w / 2) * W, (z.y + z.h * 0.13) * H, z.w * 0.3 * W, 0, Math.PI * 2);
  ctx.fill();
  if (name) label(ctx, name, z.x + z.w / 2, z.y + z.h * 0.6, '#d7dde5', 15);
}

/** A soft elliptical shadow on the ground under something. */
export function shadow(ctx: Ctx, z: Zone, colour = 'rgba(12,14,20,0.45)') {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(
    (z.x + z.w / 2) * W,
    (z.y + z.h) * H,
    z.w * 0.75 * W,
    z.h * 0.1 * H,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

/** Night: one multiply pass over the day render, never a second painting. */
export function nightPass(ctx: Ctx, tint = '#39477f') {
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'source-over';
}

/** A lit sign or window, drawn after the night pass so it reads as a light source. */
export function glow(ctx: Ctx, z: Zone, colour: string, spread = 0.02) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = '#2a1c3a';
  ctx.fillRect(
    (z.x - spread) * W,
    (z.y - spread) * H,
    (z.w + spread * 2) * W,
    (z.h + spread * 2) * H,
  );
  ctx.globalCompositeOperation = 'source-over';
  fill(ctx, z, colour);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Film grain, seeded so the same state always renders the same pixels.
 *
 * Level 4 needs this: a photo with grain everywhere is what makes a clean pasted
 * sticker stand out, and matching that grain is the counter-move.
 */
export function grain(ctx: Ctx, amount = 16, seed = 7) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, W, H);
  const rand = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * amount * 2;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** The timestamp burned into the corner of every photo in the game. */
export function stamp(ctx: Ctx, text: string, colour: string) {
  ctx.fillStyle = colour;
  ctx.font = '600 22px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, 24, 24);
}

export function reset(ctx: Ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
