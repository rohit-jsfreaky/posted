/**
 * Hand-made edits used to test the diff engine without touching the editor.
 *
 * Every case re-encodes as JPEG, because that is what the real editor hands back
 * on save — so the tests carry the same compression noise the game has to survive.
 */

import { loadImage } from './gray';
import { ZONES } from './scene';

export const SAVE_QUALITY = 0.92;

export type MutationCase = {
  id: string;
  what: string;
  expect: string[];
};

type Draw = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
) => void;

function render(w: number, h: number, draw: Draw, img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context not available');
  draw(ctx, img);
  return canvas.toDataURL('image/jpeg', SAVE_QUALITY);
}

/**
 * Subtract light, the way the editor's brightness slider does. Not a multiply:
 * dark pixels hit zero long before bright ones do.
 */
function subtractLight(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const cut = amount * 255;
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = Math.max(0, img.data[i] - cut);
    img.data[i + 1] = Math.max(0, img.data[i + 1] - cut);
    img.data[i + 2] = Math.max(0, img.data[i + 2] - cut);
  }
  ctx.putImageData(img, 0, 0);
}

/** Right edge of the bouncer zone, as a fraction. Crop here and he is gone. */
const CUT = ZONES.bouncer.x;

export const CASES: MutationCase[] = [
  { id: 'nothing', what: 'save without editing', expect: [] },
  { id: 'sticker-corner', what: 'sticker in an empty corner', expect: [] },
  { id: 'rotate90', what: 'rotate 90 degrees', expect: [] },
  { id: 'dim-15', what: 'brightness down a little (-15)', expect: [] },
  { id: 'dim-25', what: 'brightness down properly (-25)', expect: ['night'] },
  { id: 'dim-45', what: 'brightness way down (-45)', expect: ['night'] },
  { id: 'crush-60', what: 'crushed to a black square (-60)', expect: [] },
  { id: 'crop-bouncer', what: 'crop the bouncer off the edge', expect: ['bouncer_removed'] },
  {
    id: 'crop-resize',
    what: 'crop him out, then resize back to 1200x800',
    expect: ['bouncer_removed'],
  },
  { id: 'paint-over', what: 'paint over him', expect: ['bouncer_removed'] },
  {
    id: 'crop-and-dim',
    what: 'crop him out and drop brightness',
    expect: ['bouncer_removed', 'night'],
  },
];

export async function buildMutation(id: string, sourceUrl: string): Promise<string> {
  const img = await loadImage(sourceUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const cut = Math.round(w * CUT);

  switch (id) {
    case 'nothing':
      return render(w, h, (ctx) => ctx.drawImage(img, 0, 0), img);

    case 'sticker-corner':
      return render(
        w,
        h,
        (ctx) => {
          ctx.drawImage(img, 0, 0);
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
    case 'dim-45':
    case 'crush-60': {
      const amount = Number(id.split('-')[1]) / 100;
      return render(
        w,
        h,
        (ctx) => {
          ctx.drawImage(img, 0, 0);
          subtractLight(ctx, w, h, amount);
        },
        img,
      );
    }

    case 'crop-bouncer':
      return render(
        cut,
        h,
        (ctx) => ctx.drawImage(img, 0, 0, cut, h, 0, 0, cut, h),
        img,
      );

    case 'crop-resize':
      return render(
        w,
        h,
        (ctx) => ctx.drawImage(img, 0, 0, cut, h, 0, 0, w, h),
        img,
      );

    case 'paint-over':
      return render(
        w,
        h,
        (ctx) => {
          ctx.drawImage(img, 0, 0);
          const b = ZONES.bouncer;
          ctx.fillStyle = '#8d97a2';
          ctx.fillRect(
            (b.x - 0.01) * w,
            (b.y - 0.02) * h,
            (b.w + 0.02) * w,
            (b.h + 0.03) * h,
          );
        },
        img,
      );

    case 'crop-and-dim':
      return render(
        cut,
        h,
        (ctx) => {
          ctx.drawImage(img, 0, 0, cut, h, 0, 0, cut, h);
          subtractLight(ctx, cut, h, 0.25);
        },
        img,
      );

    default:
      throw new Error(`unknown mutation: ${id}`);
  }
}
