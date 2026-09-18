/**
 * Level 1 — Club Vantablack, drawn as grey boxes.
 *
 * The world is always re-rendered from state (DESIGN.md sec 2 and 4). The player's
 * saved pixels are read once for flags and then thrown away, so nothing here ever
 * reads the edited image.
 *
 * Zones are fractions of width/height, never pixels, so crop and resize cannot
 * break them.
 */

export const SCENE_W = 1200;
export const SCENE_H = 800;

export type Zone = { x: number; y: number; w: number; h: number };

export const ZONES = {
  bouncer: { x: 0.62, y: 0.4, w: 0.12, h: 0.35 },
  sign: { x: 0.28, y: 0.18, w: 0.3, h: 0.1 },
  door: { x: 0.4, y: 0.35, w: 0.18, h: 0.45 },
  facade: { x: 0.16, y: 0.08, w: 0.68, h: 0.72 },
} as const satisfies Record<string, Zone>;

export type ZoneName = keyof typeof ZONES;

export type WorldState = {
  time: 'day' | 'night';
  bouncer: boolean;
  sign: string;
  crowd: boolean;
  door: 'closed' | 'open';
};

export const INITIAL_STATE: WorldState = {
  time: 'day',
  bouncer: true,
  sign: 'PRIVATE',
  crowd: false,
  door: 'closed',
};

export function toPixels(zone: Zone, width: number, height: number) {
  return {
    x: Math.round(zone.x * width),
    y: Math.round(zone.y * height),
    w: Math.round(zone.w * width),
    h: Math.round(zone.h * height),
  };
}

const DAY = {
  sky: '#aab3bd',
  facade: '#8d97a2',
  road: '#79828d',
  kerb: '#8a939d',
  signPlate: '#e6ebf0',
  signInk: '#2b3138',
  doorClosed: '#3c434b',
  bouncer: '#4a525b',
  crowd: '#5f6871',
  caption: '#3a4149',
};

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 20,
) {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** Draw the whole world for a given state. Deterministic: same state, same pixels. */
export function composite(state: WorldState, ctx: CanvasRenderingContext2D) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // --- daylight pass: everything is drawn bright, night is applied after ---

  ctx.fillStyle = DAY.sky;
  ctx.fillRect(0, 0, w, h);

  const facade = toPixels(ZONES.facade, w, h);
  ctx.fillStyle = DAY.facade;
  ctx.fillRect(facade.x, facade.y, facade.w, facade.h);

  // windows give the facade structure, so the diff has something to hold on to
  ctx.fillStyle = '#7b858f';
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillRect(
        facade.x + facade.w * (0.06 + i * 0.185),
        facade.y + facade.h * (0.06 + j * 0.16),
        facade.w * 0.13,
        facade.h * 0.1,
      );
    }
  }

  ctx.fillStyle = DAY.road;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.fillStyle = DAY.kerb;
  ctx.fillRect(0, h * 0.72, w, h * 0.02);

  const sign = toPixels(ZONES.sign, w, h);
  ctx.fillStyle = DAY.signPlate;
  ctx.fillRect(sign.x, sign.y, sign.w, sign.h);
  label(ctx, state.sign, sign.x + sign.w / 2, sign.y + sign.h / 2, DAY.signInk, 30);

  const door = toPixels(ZONES.door, w, h);
  ctx.fillStyle = DAY.doorClosed;
  ctx.fillRect(door.x, door.y, door.w, door.h);

  if (state.crowd) {
    ctx.fillStyle = DAY.crowd;
    for (let i = 0; i < 6; i++) {
      const cx = w * (0.08 + i * 0.13);
      const cy = h * 0.66;
      ctx.fillRect(cx, cy, w * 0.035, h * 0.16);
      ctx.beginPath();
      ctx.arc(cx + w * 0.0175, cy - h * 0.02, w * 0.017, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (state.bouncer) {
    const b = toPixels(ZONES.bouncer, w, h);
    ctx.fillStyle = DAY.bouncer;
    ctx.fillRect(b.x, b.y + b.h * 0.22, b.w, b.h * 0.78);
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, b.y + b.h * 0.14, b.w * 0.3, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'BOUNCER', b.x + b.w / 2, b.y + b.h * 0.6, '#c9d0d8', 17);
  }

  // --- night is a composite operation over the day pass, never a second painting ---

  if (state.time === 'night') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#39477f';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#2a1c3a';
    ctx.fillRect(sign.x - w * 0.02, sign.y - h * 0.03, sign.w + w * 0.04, sign.h + h * 0.06);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#f4f1ff';
    ctx.fillRect(sign.x, sign.y, sign.w, sign.h);
    label(ctx, state.sign, sign.x + sign.w / 2, sign.y + sign.h / 2, '#2b1840', 30);
  }

  if (state.door === 'open') {
    // light spilling out of a live club, drawn after night so it stays a light source
    ctx.fillStyle = state.time === 'night' ? '#f0d79a' : '#c8b88a';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    label(
      ctx,
      'OPEN',
      door.x + door.w / 2,
      door.y + door.h * 0.5,
      '#5a4520',
      24,
    );
  }

  ctx.fillStyle = state.time === 'night' ? '#b9c2d6' : DAY.caption;
  ctx.font = '600 22px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `CLUB VANTABLACK   ${state.time === 'night' ? '23:41' : '14:20'}`,
    24,
    24,
  );
}

/** Composite the world to a PNG data URL. Client only — it needs a real canvas. */
export function compositeToDataUrl(state: WorldState): string {
  const canvas = document.createElement('canvas');
  canvas.width = SCENE_W;
  canvas.height = SCENE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context not available');
  composite(state, ctx);
  return canvas.toDataURL('image/png');
}
