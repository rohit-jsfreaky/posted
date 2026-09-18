'use client';

import dynamic from 'next/dynamic';

// The game composites its world on a canvas, so it never renders on the server.
// The art has to be in memory before the first frame: composite() is synchronous
// and a half-drawn world would be measured by the diff engine as if it were real.
const Game = dynamic(
  async () => {
    const [mod] = await Promise.all([
      import('@/components/Game'),
      import('@/lib/assets').then((a) => a.preloadAssets()),
    ]);
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-full items-center justify-center bg-[#0d0f13] font-mono text-sm text-[#6b7078]">
        loading Leonida…
      </main>
    ),
  },
);

export default function Home() {
  return <Game />;
}
