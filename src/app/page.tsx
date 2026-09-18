'use client';

import dynamic from 'next/dynamic';

// The game composites its world on a canvas, so it never renders on the server.
const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-full items-center justify-center bg-[#0d0f13] font-mono text-sm text-[#6b7078]">
      compositing the street…
    </main>
  ),
});

export default function Home() {
  return <Game />;
}
