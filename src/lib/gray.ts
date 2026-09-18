/**
 * Greyscale plates at a small working resolution.
 *
 * Everything the diff engine does runs on these, not on full-size pixels: it is
 * faster, and downscaling averages away the JPEG noise the editor adds on save.
 */

export type Gray = { w: number; h: number; data: Float32Array };

/** Working width for the original image. Everything else is scaled to match. */
export const WORK_W = 300;

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not decode image'));
    img.src = dataUrl;
  });
}

/** Draw an image into a w x h buffer and return luma in 0..1. */
export function grayFromImage(
  img: HTMLImageElement,
  w: number,
  h: number,
): Gray {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context not available');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const data = new Float32Array(canvas.width * canvas.height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255;
  }
  return { w: canvas.width, h: canvas.height, data };
}

/** Rotate a plate clockwise by 0, 90, 180 or 270 degrees. */
export function rotateGray(g: Gray, degrees: 0 | 90 | 180 | 270): Gray {
  if (degrees === 0) return g;
  const swapped = degrees === 90 || degrees === 270;
  const w = swapped ? g.h : g.w;
  const h = swapped ? g.w : g.h;
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx: number;
      let sy: number;
      if (degrees === 90) {
        sx = y;
        sy = g.h - 1 - x;
      } else if (degrees === 180) {
        sx = g.w - 1 - x;
        sy = g.h - 1 - y;
      } else {
        sx = g.w - 1 - y;
        sy = x;
      }
      out[y * w + x] = g.data[sy * g.w + sx];
    }
  }
  return { w, h, data: out };
}

/** Bilinear sample. Returns null outside the plate, which is how a crop is seen. */
export function sample(g: Gray, x: number, y: number): number | null {
  if (x < 0 || y < 0 || x > g.w - 1 || y > g.h - 1) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, g.w - 1);
  const y1 = Math.min(y0 + 1, g.h - 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = g.data[y0 * g.w + x0];
  const b = g.data[y0 * g.w + x1];
  const c = g.data[y1 * g.w + x0];
  const d = g.data[y1 * g.w + x1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/** Mean of every column (length w) and of every row (length h). */
export function profiles(g: Gray): { cols: Float32Array; rows: Float32Array } {
  const cols = new Float32Array(g.w);
  const rows = new Float32Array(g.h);
  for (let y = 0; y < g.h; y++) {
    let rowSum = 0;
    for (let x = 0; x < g.w; x++) {
      const v = g.data[y * g.w + x];
      rowSum += v;
      cols[x] += v;
    }
    rows[y] = rowSum / g.w;
  }
  for (let x = 0; x < g.w; x++) cols[x] /= g.h;
  return { cols, rows };
}

/**
 * Normalised cross-correlation of two equal-length series, in -1..1.
 *
 * Normalised means it ignores overall brightness and contrast, which is exactly
 * what we need: dimming the whole photo must not read as "the content changed".
 */
export function ncc(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = a.length;
  if (n === 0) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let sa = 0;
  let sb = 0;
  let sab = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    sa += da * da;
    sb += db * db;
    sab += da * db;
  }
  if (sa < 1e-7 || sb < 1e-7) return 0;
  return sab / Math.sqrt(sa * sb);
}
