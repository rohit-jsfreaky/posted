/**
 * Zones are fractions of width and height, never pixels, so crop and resize
 * cannot break them (DESIGN.md sec 5).
 */

export type Zone = { x: number; y: number; w: number; h: number };
export type ZoneMap = Record<string, Zone>;

/** Turn a fractional zone into pixels for a given canvas size. */
export function toPixels(zone: Zone, width: number, height: number) {
  return {
    x: Math.round(zone.x * width),
    y: Math.round(zone.y * height),
    w: Math.round(zone.w * width),
    h: Math.round(zone.h * height),
  };
}

/**
 * The ground just beneath something — where its shadow would fall.
 *
 * The gap matters. Butted right up against the object, the band ends up half
 * covered by whatever the player placed, and a bright sticker hanging into it
 * reads as "brighter here", which is the opposite of a shadow.
 */
export function below(zone: Zone, depth = 0.06, gap = 0.02): Zone {
  return {
    x: zone.x - zone.w * 0.1,
    y: Math.min(0.999, zone.y + zone.h + gap),
    w: zone.w * 1.2,
    h: depth,
  };
}
