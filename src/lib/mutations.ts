/**
 * Hand-made edits used to test the diff engine without touching the editor.
 *
 * Every case re-encodes as JPEG, because that is what the real editor hands back
 * on save — so the tests carry the same compression noise the game has to survive.
 */

import { loadImage } from './gray';
import type { Level } from './level';
import type { Zone } from './zones';

export const SAVE_QUALITY = 0.92;

export type MutationCase = {
  id: string;
  what: string;
  /** which level this edit is aimed at */
  level: number;
  expect: string[];
};

type Draw = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => void;

function render(w: number, h: number, draw: Draw, img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context not available');
  draw(ctx, img);
  return canvas.toDataURL('image/jpeg', SAVE_QUALITY);
}

/**
 * Subtract light, the way the editor's brightness slider does. Not a multiply:
 * dark pixels hit zero long before bright ones do.
 */
function shiftLight(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const cut = amount * 255;
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + cut));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + cut));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + cut));
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * A pasted car, with the shape and internal detail a real sticker has. A flat
 * rectangle is not a fair stand-in: at low opacity it just tints the asphalt and
 * the diff correctly sees nothing, which is not what dropping a car sticker on a
 * bay looks like.
 */
function pasteCar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  z: Zone,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const x = z.x * w;
  const y = z.y * h;
  const zw = z.w * w;
  const zh = z.h * h;
  ctx.fillStyle = '#b4472f';
  ctx.fillRect(x, y + zh * 0.35, zw, zh * 0.5);
  ctx.fillStyle = '#c85a3c';
  ctx.fillRect(x + zw * 0.16, y + zh * 0.05, zw * 0.66, zh * 0.34);
  ctx.fillStyle = '#e8e2d8';
  ctx.fillRect(x + zw * 0.21, y + zh * 0.11, zw * 0.26, zh * 0.2);
  ctx.fillRect(x + zw * 0.53, y + zh * 0.11, zw * 0.26, zh * 0.2);
  ctx.fillStyle = '#1d1f24';
  ctx.beginPath();
  ctx.arc(x + zw * 0.24, y + zh * 0.86, zw * 0.1, 0, Math.PI * 2);
  ctx.arc(x + zw * 0.76, y + zh * 0.86, zw * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, z: Zone, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(
    (z.x - 0.008) * w,
    (z.y - 0.012) * h,
    (z.w + 0.016) * w,
    (z.h + 0.024) * h,
  );
}

export const CASES: MutationCase[] = [
  // level 1 — crop, and false positives
  { id: 'nothing', what: 'save without editing', level: 1, expect: [] },
  { id: 'sticker-corner', what: 'sticker in an empty corner', level: 1, expect: [] },
  { id: 'rotate90', what: 'rotate 90 degrees', level: 1, expect: [] },
  { id: 'dim-15', what: 'brightness down a little', level: 1, expect: [] },
  { id: 'dim-25', what: 'brightness down properly', level: 1, expect: ['night'] },
  { id: 'crush-60', what: 'crushed to a black square', level: 1, expect: [] },
  { id: 'crop-bouncer', what: 'crop the bouncer off the edge', level: 1, expect: ['bouncer_removed'] },
  {
    id: 'crop-resize',
    what: 'crop him out, then resize back',
    level: 1,
    expect: ['bouncer_removed'],
  },
  {
    id: 'crop-and-dim',
    what: 'crop him out and drop brightness',
    level: 1,
    expect: ['bouncer_removed', 'night'],
  },

  // level 2 — the frame has to go back to the right size
  { id: 'l2-crop-only', what: 'crop the car off', level: 2, expect: ['car_removed'] },
  {
    id: 'l2-crop-resize',
    what: 'crop the car off, then resize back',
    level: 2,
    expect: ['car_removed', 'dims_restored'],
  },
  { id: 'l2-untouched', what: 'save without editing', level: 2, expect: ['dims_restored'] },

  // level 3 — four tools reach the window at four prices
  {
    id: 'l3-cover-window',
    what: 'cover the window in a matching colour',
    level: 3,
    expect: ['reflection_removed'],
  },
  {
    id: 'l3-blow-out',
    what: 'raise brightness until the window clips',
    level: 3,
    expect: ['reflection_removed'],
  },
  {
    id: 'l3-all-three',
    what: 'blow out the window, cover the other two',
    level: 3,
    expect: ['subject_removed', 'reflection_removed', 'water_removed'],
  },

  // level 4 — adding something, and making it survive a zoom
  { id: 'l4-sticker-only', what: 'paste a car, nothing else', level: 4, expect: ['car_placed'] },
  {
    id: 'l4-sticker-shadow',
    what: 'paste a car and draw its shadow',
    level: 4,
    expect: ['car_placed', 'shadow_added'],
  },
  {
    id: 'l4-full',
    what: 'paste a car at lower opacity, and shadow it',
    level: 4,
    expect: ['car_placed', 'shadow_added'],
  },

  // level 5 — claim a source instead of changing a fact
  { id: 'l5-frame-only', what: 'add a frame', level: 5, expect: ['official'] },
  { id: 'l5-redact-only', what: 'black bar over the face', level: 5, expect: ['face_hidden'] },
  {
    id: 'l5-full',
    what: 'frame it, label it, redact the witness',
    level: 5,
    expect: ['official', 'face_hidden', 'case_numbered'],
  },
];

export async function buildMutation(
  id: string,
  sourceUrl: string,
  level: Level,
): Promise<string> {
  const img = await loadImage(sourceUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const Z = level.zones;
  const base = (ctx: CanvasRenderingContext2D) => ctx.drawImage(img, 0, 0);

  switch (id) {
    case 'nothing':
    case 'l2-untouched':
      return render(w, h, base, img);

    case 'sticker-corner':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          ctx.fillStyle = '#ff2d55';
          ctx.beginPath();
          ctx.arc(w * 0.92, h * 0.06, w * 0.025, 0, Math.PI * 2);
          ctx.fill();
        },
        img,
      );

    case 'rotate90':
      return render(
        h,
        w,
        (ctx) => {
          ctx.translate(h, 0);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, 0, 0);
        },
        img,
      );

    case 'dim-15':
    case 'dim-25':
    case 'crush-60': {
      const amount = Number(id.split('-')[1]) / 100;
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          shiftLight(ctx, w, h, -amount);
        },
        img,
      );
    }

    case 'crop-bouncer': {
      const cut = Math.round(w * Z.bouncer.x);
      return render(cut, h, (ctx) => ctx.drawImage(img, 0, 0, cut, h, 0, 0, cut, h), img);
    }

    case 'crop-resize': {
      const cut = Math.round(w * Z.bouncer.x);
      return render(w, h, (ctx) => ctx.drawImage(img, 0, 0, cut, h, 0, 0, w, h), img);
    }

    case 'crop-and-dim': {
      const cut = Math.round(w * Z.bouncer.x);
      return render(
        cut,
        h,
        (ctx) => {
          ctx.drawImage(img, 0, 0, cut, h, 0, 0, cut, h);
          shiftLight(ctx, cut, h, -0.25);
        },
        img,
      );
    }

    case 'l2-crop-only': {
      const cut = Math.round(w * Z.car.x);
      return render(cut, h, (ctx) => ctx.drawImage(img, 0, 0, cut, h, 0, 0, cut, h), img);
    }

    case 'l2-crop-resize': {
      const cut = Math.round(w * Z.car.x);
      return render(w, h, (ctx) => ctx.drawImage(img, 0, 0, cut, h, 0, 0, w, h), img);
    }

    case 'l3-cover-window':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          paint(ctx, w, h, Z.reflection, '#dedbec');
        },
        img,
      );

    case 'l3-blow-out':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          shiftLight(ctx, w, h, 0.22);
        },
        img,
      );

    case 'l3-all-three':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          shiftLight(ctx, w, h, 0.22);
          paint(ctx, w, h, Z.subject, '#48536e');
          paint(ctx, w, h, Z.water, '#3f4a63');
        },
        img,
      );

    case 'l4-sticker-only':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          pasteCar(ctx, w, h, Z.spot);
        },
        img,
      );

    case 'l4-sticker-shadow':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          pasteCar(ctx, w, h, Z.spot);
          ctx.fillStyle = 'rgba(8,10,14,0.65)';
          ctx.fillRect(
            Z.spot_shadow.x * w,
            Z.spot_shadow.y * h,
            Z.spot_shadow.w * w,
            Z.spot_shadow.h * h,
          );
        },
        img,
      );

    case 'l4-full':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          // the same paste, dropped in opacity until it sits in the lot's light
          pasteCar(ctx, w, h, Z.spot, 0.6);
          ctx.fillStyle = 'rgba(8,10,14,0.65)';
          ctx.fillRect(
            Z.spot_shadow.x * w,
            Z.spot_shadow.y * h,
            Z.spot_shadow.w * w,
            Z.spot_shadow.h * h,
          );
        },
        img,
      );

    case 'l5-frame-only':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          ctx.strokeStyle = '#15181c';
          ctx.lineWidth = Math.round(w * 0.024);
          ctx.strokeRect(
            ctx.lineWidth / 2,
            ctx.lineWidth / 2,
            w - ctx.lineWidth,
            h - ctx.lineWidth,
          );
        },
        img,
      );

    case 'l5-redact-only':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          paint(ctx, w, h, Z.face, '#0c0e12');
        },
        img,
      );

    case 'l5-full':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          paint(ctx, w, h, Z.face, '#0c0e12');
          paint(ctx, w, h, Z.label, '#e7e4da');
          ctx.fillStyle = '#24272b';
          ctx.font = `600 ${Math.round(h * 0.035)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VCPD-8842137', (Z.label.x + Z.label.w / 2) * w, (Z.label.y + Z.label.h / 2) * h);
          ctx.strokeStyle = '#15181c';
          ctx.lineWidth = Math.round(w * 0.024);
          ctx.strokeRect(
            ctx.lineWidth / 2,
            ctx.lineWidth / 2,
            w - ctx.lineWidth,
            h - ctx.lineWidth,
          );
        },
        img,
      );

    default:
      throw new Error(`unknown mutation: ${id}`);
  }
}
