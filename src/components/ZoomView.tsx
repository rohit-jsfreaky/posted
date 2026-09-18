'use client';

import type { CSSProperties } from 'react';
import type { Zone } from '@/lib/zones';

/**
 * The camera pushing into one region of a photo.
 *
 * Scaling around a transform origin placed on the zone keeps that exact point
 * still while everything around it grows, which is what zooming in feels like.
 */
export default function ZoomView({
  image,
  zone,
  scale = 3.2,
  animate = true,
  height = 200,
  ring = true,
}: {
  image: string;
  zone: Zone;
  scale?: number;
  animate?: boolean;
  height?: number;
  ring?: boolean;
}) {
  const cx = (zone.x + zone.w / 2) * 100;
  const cy = (zone.y + zone.h / 2) * 100;

  const imageStyle: CSSProperties = animate
    ? {
        transformOrigin: `${cx}% ${cy}%`,
        animation: 'push-in 1100ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        ['--zoom-scale' as string]: String(scale),
      }
    : {
        transformOrigin: `${cx}% ${cy}%`,
        transform: `translateY(-50%) scale(${scale})`,
      };

  return (
    <div
      className="relative overflow-hidden rounded border border-[#2a2f38] bg-black"
      style={{ height }}
    >
      {/* keyed so a new tell restarts the push rather than sitting at the end of the last one */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${image.length}-${cx}-${cy}`}
        src={image}
        alt="zoomed in"
        className="absolute left-0 top-1/2 w-full -translate-y-1/2"
        style={imageStyle}
      />
      {ring && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-[#ff5d5d]"
          style={{
            left: `${cx}%`,
            top: `${cy}%`,
            width: 74,
            height: 74,
            marginLeft: -37,
            marginTop: -37,
            opacity: 0,
            animation: 'ring-in 500ms ease 800ms forwards',
          }}
        />
      )}
    </div>
  );
}
