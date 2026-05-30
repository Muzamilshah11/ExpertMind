'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const LiveSession = dynamic(() => import('@/components/LiveSession'), {
  ssr: false,
});

function SessionContent() {
  const searchParams = useSearchParams();
  const autoConnect = searchParams.get('connect') === 'true';

  return <LiveSession autoConnect={autoConnect} />;
}

export default function SessionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <SessionContent />
      </Suspense>
    </div>
  );
}
