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
    <span className="text-[10px] text-dim">♥ {n.toLocaleString()}</span>
  );
}

export default function Feed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[11px] text-dim">
        nothing posted yet. edit the photo, then hit POST IT.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => {
        if (item.kind === 'system') {
          return (
            <p
              key={item.id}
              className="px-1 py-1 text-[10px] tracking-[0.14em] text-accent"
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
            className={`rise border-l-2 p-2 ${
              him ? 'border-accent bg-raised' : 'border-line bg-panel'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[11px] ${him ? 'text-accent' : 'text-mute'}`}
              >
                @{item.who}
              </span>
              <Likes n={item.likes} />
            </div>

            <p className="mt-1 text-xs leading-snug text-text/85">{item.text}</p>

            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt="posted"
                className="mt-2 w-full border border-line"
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
