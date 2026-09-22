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
  { id: 'flip-h', what: 'flip the photo left to right', level: 1, expect: [] },
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
  { id: 'l2-untouched', what: 'save without editing', level: 2, expect: [] },

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

  // level 6 — the only job whose answer is in the top half of the filter panel
  { id: 'l6-grey-only', what: 'drain the colour, nothing else', level: 6, expect: ['colour_gone'] },
  {
    id: 'l6-grey-grain',
    what: 'drain the colour and add grain',
    level: 6,
    expect: ['colour_gone', 'grain_added'],
  },
  {
    id: 'l6-full',
    what: 'drain, grain, and crop the car off',
    level: 6,
    expect: ['colour_gone', 'grain_added', 'ev_gone'],
  },
  { id: 'l6-grain-only', what: 'add grain to a colour photo', level: 6, expect: ['grain_added'] },
  // colour and grain are absolute measures, so the only honest check that the
  // thresholds clear the art's own noise floor is the art itself
  { id: 'l6-untouched', what: 'save without editing', level: 6, expect: [] },
  { id: 'l6-dim', what: 'brightness down, colour intact', level: 6, expect: [] },
  // cropping must not look like grain: a smaller frame is re-encoded and that
  // alone could move an absolute noise floor if the threshold were too low
  {
    id: 'l6-grey-crop',
    what: 'drain the colour and crop, no grain',
    level: 6,
    expect: ['colour_gone', 'ev_gone'],
  },

  // level 7 — the fingerprint a device leaves, not the thing in the frame
  { id: 'l7-untouched', what: 'save without editing', level: 7, expect: [] },
  { id: 'l7-ratio', what: 'crop to 4:3, nothing else', level: 7, expect: ['ratio_fixed'] },
  { id: 'l7-tone', what: 'crush the contrast only', level: 7, expect: ['tone_crushed'] },
  { id: 'l7-sharp', what: 'sharpen only', level: 7, expect: ['oversharpened'] },
  {
    id: 'l7-full',
    what: '4:3, crushed, and oversharpened',
    level: 7,
    expect: ['ratio_fixed', 'tone_crushed', 'oversharpened'],
  },

  // level 8 — the one photograph where turning every colour at once is honest
  { id: 'l8-untouched', what: 'save without editing', level: 8, expect: [] },
  { id: 'l8-sat-only', what: 'saturation up, no turn', level: 8, expect: [] },
  { id: 'l8-turn-small', what: 'a short turn toward red', level: 8, expect: ['turned_red'] },
  {
    id: 'l8-full',
    what: 'a short turn and saturation up',
    level: 8,
    expect: ['turned_red'],
  },
  { id: 'l8-turn-far', what: 'run the hue slider a long way', level: 8, expect: [] },

  // level 9 — the picture that is a picture of him
  { id: 'l9-untouched', what: 'save without editing', level: 9, expect: [] },
  {
    id: 'l9-graded',
    what: 'colour grade the screenshot and nothing else',
    level: 9,
    expect: [],
  },
  { id: 'l9-rewrite', what: 'write over what he said', level: 9, expect: ['quote_changed'] },
  // cropping the attachment away takes two thirds of the frame with it, and the
  // aligner is right to refuse a strip it cannot place. The job says so now
  {
    id: 'l9-crop-proof',
    what: 'crop the attachment off, which takes most of the frame',
    level: 9,
    expect: [],
  },
  {
    id: 'l9-board-proof',
    what: 'board the attachment over in the panel colour',
    level: 9,
    expect: ['proof_gone'],
  },
  {
    id: 'l9-full',
    what: 'rewrite him and take the attachment away',
    level: 9,
    expect: ['quote_changed', 'proof_gone'],
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

    // the editor has this button, and before the aligner looked for mirrors it
    // was worth two free flags
    case 'flip-h':
      return render(
        w,
        h,
        (ctx) => {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0);
        },
        img,
      );

    case 'l8-untouched':
      return render(w, h, (ctx) => ctx.drawImage(img, 0, 0), img);

    case 'l8-sat-only':
    case 'l8-turn-small':
    case 'l8-full':
    case 'l8-turn-far': {
      const turn =
        id === 'l8-turn-small' || id === 'l8-full' ? 30 : id === 'l8-turn-far' ? 150 : 0;
      const sat = id === 'l8-sat-only' || id === 'l8-full';
      return render(
        w,
        h,
        (ctx) => {
          // the editor's Hue and Saturation, near enough: both are CSS filters
          const parts = [];
          if (turn) parts.push(`hue-rotate(${turn}deg)`);
          if (sat) parts.push('saturate(1.55)');
          ctx.filter = parts.length ? parts.join(' ') : 'none';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';
        },
        img,
      );
    }

    case 'l7-untouched':
      return render(w, h, (ctx) => ctx.drawImage(img, 0, 0), img);

    case 'l7-ratio':
    case 'l7-tone':
    case 'l7-sharp':
    case 'l7-full': {
      const ratio = id === 'l7-ratio' || id === 'l7-full';
      const tone = id === 'l7-tone' || id === 'l7-full';
      const sharp = id === 'l7-sharp' || id === 'l7-full';
      // 4:3 out of a 3:2 frame is a crop off the sides
      const kw = ratio ? Math.round((h * 4) / 3) : w;
      return render(
        kw,
        h,
        (ctx) => {
          if (tone) ctx.filter = 'contrast(1.45)';
          ctx.drawImage(img, ratio ? -Math.round((w - kw) / 2) : 0, 0);
          ctx.filter = 'none';
          if (!sharp) return;
          // an unsharp mask, which is what the editor's Sharpen is: the image
          // plus its own difference from a blurred copy of itself
          const base = ctx.getImageData(0, 0, kw, h);
          ctx.save();
          ctx.filter = 'blur(1.4px)';
          ctx.drawImage(ctx.canvas, 0, 0);
          ctx.restore();
          ctx.filter = 'none';
          const soft = ctx.getImageData(0, 0, kw, h);
          const out = ctx.createImageData(kw, h);
          for (let i = 0; i < out.data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
              const v = base.data[i + c] + 1.5 * (base.data[i + c] - soft.data[i + c]);
              out.data[i + c] = Math.max(0, Math.min(255, v));
            }
            out.data[i + 3] = 255;
          }
          ctx.putImageData(out, 0, 0);
        },
        img,
      );
    }

    case 'l6-untouched':
      return render(w, h, (ctx) => ctx.drawImage(img, 0, 0), img);

    case 'l6-dim':
      return render(
        w,
        h,
        (ctx) => {
          ctx.drawImage(img, 0, 0);
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(0, 0, w, h);
        },
        img,
      );

    case 'l6-grey-only':
    case 'l6-grey-grain':
    case 'l6-grey-crop':
    case 'l6-full':
    case 'l6-grain-only': {
      const grey = id !== 'l6-grain-only';
      const noise = id !== 'l6-grey-only' && id !== 'l6-grey-crop';
      // these two also lose the right edge, where the car is parked
      const keep = id === 'l6-full' || id === 'l6-grey-crop' ? Math.round(w * 0.72) : w;
      return render(
        keep,
        h,
        (ctx) => {
          if (grey) ctx.filter = 'grayscale(1)';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';
          if (!noise) return;
          // the editor's Noise slider, near enough: monochrome speckle over the
          // whole photo layer
          const px = ctx.getImageData(0, 0, keep, h);
          const d = px.data;
          for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * 56;
            d[i] = Math.max(0, Math.min(255, d[i] + n));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
          }
          ctx.putImageData(px, 0, 0);
        },
        img,
      );
    }

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

    case 'l9-untouched':
      return render(w, h, base, img);

    /**
     * A screenshot that has been through a filter.
     *
     * The one job where reaching for the filter panel is the wrong answer, so
     * the engine has to agree that it changed nothing worth a flag: a global
     * light shift is what the photometric fit is for, and no zone should read
     * as touched because of it.
     */
    case 'l9-graded':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          shiftLight(ctx, w, h, -0.12);
        },
        img,
      );

    // words typed over his words, which is all the engine can see of REWRITE
    case 'l9-rewrite':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          paint(ctx, w, h, Z.quote, '#eceef2');
          ctx.fillStyle = '#16181d';
          ctx.font = `600 ${Math.round(h * 0.037)}px monospace`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'i made the whole thing up',
            Z.quote.x * w,
            (Z.quote.y + Z.quote.h / 2) * h,
          );
        },
        img,
      );

    /**
     * The attachment cropped off the bottom.
     *
     * The frame keeps its width and loses everything below the photograph, which
     * is a far more extreme crop than any other job asks for — worth a case of
     * its own, because the aligner has to still recognise the strip that is left.
     */
    case 'l9-crop-proof': {
      const keep = Math.round(Z.proof.y * h);
      return render(
        w,
        keep,
        (ctx) => ctx.drawImage(img, 0, 0, w, keep, 0, 0, w, keep),
        img,
      );
    }

    // or covered in the colour the panel already is, which is what BOARD UP does
    case 'l9-board-proof':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          paint(ctx, w, h, Z.proof, '#eceef2');
        },
        img,
      );

    case 'l9-full':
      return render(
        w,
        h,
        (ctx) => {
          base(ctx);
          paint(ctx, w, h, Z.proof, '#eceef2');
          paint(ctx, w, h, Z.quote, '#eceef2');
          ctx.fillStyle = '#16181d';
          ctx.font = `600 ${Math.round(h * 0.037)}px monospace`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'i made the whole thing up',
            Z.quote.x * w,
            (Z.quote.y + Z.quote.h / 2) * h,
          );
        },
        img,
      );

    default:
      throw new Error(`unknown mutation: ${id}`);
  }
}
