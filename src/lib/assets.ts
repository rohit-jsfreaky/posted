/**
 * Art loading.
 *
 * `composite()` has to stay synchronous — it is called during render, and the
 * whole game is built on being able to redraw the world from state at any moment.
 * So every image is loaded once up front and then read straight out of the cache.
 *
 * Cut-outs are pre-trimmed to their content (see `tools/prep.py`), which means a
 * zone and the art that fills it are the same rectangle. Nothing has to guess
 * where inside a transparent square the person actually is.
 */

export const ASSETS = {
  'bg-club': '/art/bg-club.jpg',
  'bg-street': '/art/bg-street.jpg',
  'bg-marina': '/art/bg-marina.jpg',
  'bg-lot': '/art/bg-lot.jpg',
  'bg-archive': '/art/bg-archive.jpg',
  'cut-bouncer': '/art/cut-bouncer.png',
  'cut-subject': '/art/cut-subject.png',
  'cut-car': '/art/cut-car.png',
  'cut-witness': '/art/cut-witness.png',
} as const;

export type AssetName = keyof typeof ASSETS;

const cache = new Map<AssetName, HTMLImageElement>();
let pending: Promise<void> | null = null;

function load(name: AssetName): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      cache.set(name, img);
      resolve();
    };
    img.onerror = () => reject(new Error(`could not load ${ASSETS[name]}`));
    img.src = ASSETS[name];
  });
}

/** Load everything once. Safe to call repeatedly; the same promise comes back. */
export function preloadAssets(): Promise<void> {
  if (!pending) {
    pending = Promise.all(
      (Object.keys(ASSETS) as AssetName[]).map(load),
    ).then(() => undefined);
  }
  return pending;
}

export function isReady(): boolean {
  return cache.size === Object.keys(ASSETS).length;
}

/**
 * The loaded image. Throws if the art was not preloaded, which is deliberate:
 * a half-drawn world is worse than a loud failure, because the diff engine would
 * quietly measure whatever happened to be on the canvas.
 */
export function art(name: AssetName): HTMLImageElement {
  const img = cache.get(name);
  if (!img) throw new Error(`art not loaded: ${name}. Call preloadAssets() first.`);
  return img;
}
