'use client';

import { useState } from 'react';
import ZoomView from './ZoomView';
import { faceFor, initialsFor } from '@/lib/faces';
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
  /**
   * The file the player actually saved, when it differs from what was posted.
   *
   * What goes out is the photograph the street printed. This is the working copy
   * behind it — the black bar at an angle, the shape in roughly the right colour.
   * Hiding it would be a cheat, so it is one click away and never the default.
   */
  sent?: string;
  likes: number;
  /** set on his posts: the bit of the photo he zoomed into */
  zoom?: { image: string; zone: Zone };
};

export const HIM = 'cal_hampton_77';

/**
 * Who is talking.
 *
 * Everybody who speaks more than once has a portrait. The one account that does
 * not is the client who will not give a name, and the blank square where his
 * face should be is the point rather than an omission.
 */
export function Avatar({ who, size = 26 }: { who: string; size?: number }) {
  const src = faceFor(who);
  if (!src) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center border border-line bg-ink text-[9px] text-dim"
      >
        {initialsFor(who)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 border border-line object-cover"
    />
  );
}

function Likes({ n }: { n: number }) {
  return (
    <span className="text-[10px] text-dim">♥ {n.toLocaleString()}</span>
  );
}

/** The posted photograph, with the working copy behind a toggle. */
function PostImage({ printed, sent }: { printed: string; sent?: string }) {
  const [raw, setRaw] = useState(false);
  const showing = raw && sent ? sent : printed;
  return (
    <div className="mt-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={showing}
        alt="posted"
        className={`w-full border ${raw ? 'border-accent' : 'border-line'}`}
      />
      {sent && (
        <button
          data-testid="toggle-sent"
          onClick={() => setRaw((v) => !v)}
          className="eyebrow mt-1 text-[9px] text-dim hover:text-accent"
        >
          {raw ? '← what the street printed' : 'what you actually sent →'}
        </button>
      )}
    </div>
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
            <div className="flex items-center gap-2">
              <Avatar who={item.who} />
              <span className={`text-[11px] ${him ? 'text-accent' : 'text-mute'}`}>
                @{item.who}
              </span>
              <span className="ml-auto">
                <Likes n={item.likes} />
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-snug text-text/85">{item.text}</p>

            {item.image && <PostImage printed={item.image} sent={item.sent} />}

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
