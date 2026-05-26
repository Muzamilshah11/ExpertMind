'use client';

import dynamic from 'next/dynamic';

const LiveSession = dynamic(() => import('@/components/LiveSession'), {
  ssr: false,
});

export default function SessionPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <LiveSession />
    </div>
  );
}
