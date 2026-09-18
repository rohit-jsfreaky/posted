'use client';

import dynamic from 'next/dynamic';

// Everything composites on a canvas, so nothing here renders on the server.
const Shell = dynamic(() => import('@/components/Shell'), {
  ssr: false,
  loading: () => <main className="h-full w-full bg-ink" />,
});

export default function Home() {
  return <Shell />;
}
