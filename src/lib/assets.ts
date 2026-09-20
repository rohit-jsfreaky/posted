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
  'bg-diner': '/art/bg-diner.jpg',
  'bg-dock': '/art/bg-dock.jpg',
  'bg-neon': '/art/bg-neon.jpg',
  'cut-bouncer': '/art/cut-bouncer.png',
  'cut-subject': '/art/cut-subject.png',
  'cut-car': '/art/cut-car.png',
  'cut-witness': '/art/cut-witness.png',
  'cut-ev': '/art/cut-ev.png',
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

/**
 * Load everything once. Safe to call repeatedly; the same promise comes back.
 *
 * `onProgress` reports real decoded-image progress, so the loading screen's bar
 * is measuring something rather than counting down a made-up timer.
 */
export function preloadAssets(onProgress?: (done: number) => void): Promise<void> {
  if (!pending) {
    const names = Object.keys(ASSETS) as AssetName[];
    let done = 0;
    pending = Promise.all(
      names.map((n) =>
        load(n).then(() => {
          done += 1;
          onProgress?.(done / names.length);
        }),
      ),
    ).then(() => undefined);
  } else {
    onProgress?.(cache.size / Object.keys(ASSETS).length);
  }
  return pending;
}

export function assetCount(): number {
  return Object.keys(ASSETS).length;
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
