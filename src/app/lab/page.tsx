'use client';

import dynamic from 'next/dynamic';

const Lab = dynamic(() => import('@/components/Lab'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-full items-center justify-center bg-[#0d0f13] font-mono text-sm text-[#6b7078]">
      loading test bench…
    </main>
  ),
});

export default function LabPage() {
  return <Lab />;
}
