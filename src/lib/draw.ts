/**
 * Scene drawing helpers.
 *
 * Every scene is built from these, and everything takes fractional coordinates so
 * the art and the zones speak the same language. A zone is both where the diff
 * engine looks and where the art gets drawn — they cannot drift apart.
 */

import { art, type AssetName } from './assets';
import type { Zone } from './zones';

export const SCENE_W = 1200;
export const SCENE_H = 800;

export type Ctx = CanvasRenderingContext2D;

export function fill(ctx: Ctx, z: Zone, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(z.x * ctx.canvas.width, z.y * ctx.canvas.height, z.w * ctx.canvas.width, z.h * ctx.canvas.height);
}

/** Draw a background so it fills the whole frame. */
export function backdrop(ctx: Ctx, name: AssetName) {
  ctx.drawImage(art(name), 0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Draw a cut-out into a zone.
 *
 * It fills the zone exactly rather than fitting inside it. The cut-outs are
 * trimmed to their content, so the zone and the object are the same rectangle —
 * which is the property the diff engine depends on. Zones are chosen to match
 * each cut-out's proportions, so nothing is visibly stretched.
 */
export function place(ctx: Ctx, name: AssetName, z: Zone, alpha = 1) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(art(name), z.x * W, z.y * H, z.w * W, z.h * H);
  ctx.restore();
}

/** Draw a cut-out mirrored, for a reflection in glass. */
export function placeMirrored(ctx: Ctx, name: AssetName, z: Zone, alpha = 1) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate((z.x + z.w) * W, z.y * H);
  ctx.scale(-1, 1);
  ctx.drawImage(art(name), 0, 0, z.w * W, z.h * H);
  ctx.restore();
}

/** Draw a cut-out upside down, for a reflection in water. */
export function placeFlipped(ctx: Ctx, name: AssetName, z: Zone, alpha = 1) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(z.x * W, (z.y + z.h) * H);
  ctx.scale(1, -1);
  ctx.drawImage(art(name), 0, 0, z.w * W, z.h * H);
  ctx.restore();
}

/**
 * Sun catching glass: solid across the zone, then falling away outside it.
 *
 * The shape does two jobs. Visually, light that fades at its edges reads as a
 * flare on a pane, where a hard-edged fill reads as a white billboard stuck on
 * the building. Mechanically, the inside has to be uniformly near-white, because
 * Level 3's cheapest solution works by the whole measured zone clipping at once
 * when the photo is brightened — a flare that dimmed toward the middle of the
 * zone would leave contrast behind and the flag would never fire.
 */
export function glare(ctx: Ctx, z: Zone, strength = 0.55, spread = 1.8) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cx = (z.x + z.w / 2) * W;
  const cy = (z.y + z.h / 2) * H;
  const inner = Math.hypot((z.w * W) / 2, (z.h * H) / 2);
  const outer = inner * spread;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
  g.addColorStop(0, `rgba(255,255,255,${strength})`);
  g.addColorStop(inner / outer, `rgba(255,255,255,${strength})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(cx - outer, cy - outer, outer * 2, outer * 2);
  ctx.restore();
}

export function label(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  colour: string,
  size = 20,
  align: CanvasTextAlign = 'center',
  /**
   * Signs in a photograph are rarely square to the camera.
   *
   * `tilt` turns the writing to sit along the plate it is written on, in degrees,
   * and `fit` is the widest it may run as a fraction of the canvas — a long street
   * name is squeezed to stay inside its sign rather than hanging off both ends.
   */
  tilt = 0,
  fit?: number,
) {
  const W = ctx.canvas.width;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.font = `600 ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  if (tilt) {
    ctx.translate(x * W, y * ctx.canvas.height);
    ctx.rotate((tilt * Math.PI) / 180);
    ctx.translate(-x * W, -y * ctx.canvas.height);
  }

  const room = fit === undefined ? undefined : fit * W;
  if (room !== undefined) ctx.fillText(text, x * W, y * ctx.canvas.height, room);
  else ctx.fillText(text, x * W, y * ctx.canvas.height);
  ctx.restore();
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
