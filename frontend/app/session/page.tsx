'use client';

import dynamic from 'next/dynamic';

const LiveSession = dynamic(() => import('@/components/LiveSession'), {
  ssr: false,
});

export default function SessionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <LiveSession />
    </div>
  );
}
