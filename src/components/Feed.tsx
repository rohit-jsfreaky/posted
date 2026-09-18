'use client';

import ZoomView from './ZoomView';
import type { Zone } from '@/lib/zones';

/**
 * The feed. It does not check anything, which is the entire premise.
 *
 * Opinion is fractured on purpose: believers, doubters, and somebody talking
 * about something else entirely.
 */

export type FeedItem = {
  id: string;
  kind: 'post' | 'reply' | 'him' | 'system';
  who: string;
  text: string;
  image?: string;
  likes: number;
  /** set on his posts: the bit of the photo he zoomed into */
  zoom?: { image: string; zone: Zone };
};

export const HIM = 'cal_hampton_77';

function Likes({ n }: { n: number }) {
  return (
    <span className="font-mono text-[10px] text-[#6b7078]">
      ♥ {n.toLocaleString()}
    </span>
  );
}

export default function Feed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <p className="font-mono text-xs text-[#6b7078]">
        nothing posted yet. edit the photo, then press Save to post it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.kind === 'system') {
          return (
            <p
              key={item.id}
              className="px-1 py-0.5 font-mono text-[10px] tracking-widest text-[#6b7078]"
            >
              {item.text}
            </p>
          );
        }

        const him = item.kind === 'him';
        return (
          <article
            key={item.id}
            data-testid={him ? 'him-post' : 'feed-item'}
            className={`rounded-lg border p-2 ${
              him
                ? 'border-[#5e3030] bg-[#1f1416]'
                : 'border-[#262a31] bg-[#171a21]'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`font-mono text-[11px] ${
                  him ? 'text-[#ff8a8a]' : 'text-[#7e8794]'
                }`}
              >
                @{item.who}
              </span>
              <Likes n={item.likes} />
            </div>

            <p className="mt-1 text-sm leading-snug text-[#d2d8df]">{item.text}</p>

            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt="posted"
                className="mt-2 w-full rounded border border-[#262a31]"
              />
            )}

            {item.zoom && (
              <div className="mt-2">
                <ZoomView image={item.zoom.image} zone={item.zoom.zone} height={170} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
