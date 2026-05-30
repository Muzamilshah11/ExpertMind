'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [showLanding, setShowLanding] = useState(true);
  const [exiting, setExiting] = useState(false);
  const router = useRouter();

  const handleStart = () => {
    setExiting(true);
    setTimeout(() => {
      setShowLanding(false);
      router.push('/session?connect=true');
    }, 600);
  };

  if (!showLanding) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 animate-gradient" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Floating particles */}
      <div className="landing-particle w-72 h-72 top-10 left-[10%] animate-float" />
      <div className="landing-particle w-48 h-48 top-[30%] right-[15%] animate-float-delayed" />
      <div className="landing-particle w-56 h-56 bottom-[20%] left-[20%] animate-float-slow" />
      <div className="landing-particle w-40 h-40 bottom-[10%] right-[25%] animate-float" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse-glow" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Logo icon */}
        <div className={`mb-6 ${exiting ? 'opacity-0 scale-75' : 'opacity-100 scale-100'} transition-all duration-500`}>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-blue-600/20 animate-pulse-glow">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-5xl md:text-7xl font-bold text-slate-100 mb-4 tracking-tight ${exiting ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'} transition-all duration-500`}>
          Expert<span className="text-blue-500">Mind</span>
        </h1>

        {/* Tagline */}
        <p className={`text-lg md:text-xl text-slate-400 mb-10 text-center max-w-md ${exiting ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'} transition-all duration-500 delay-100`}>
          Your elite multimodal AI consultant
        </p>

        {/* Start Session button */}
        <button
          onClick={handleStart}
          className={`group relative px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium rounded-2xl transition-all duration-300 animate-pulse-glow hover:scale-105 ${exiting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
        >
          <span className="relative z-10 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Session
          </span>
        </button>

        {/* Urdu subtitle */}
        <p className={`mt-6 text-sm text-slate-600 font-urdu ${exiting ? 'opacity-0' : 'opacity-100'} transition-all duration-300 delay-200`}>
          آپ کا ذہین ملٹی موڈل اے آئی کنسلٹنٹ
        </p>

        {/* Bottom hint */}
        <div className={`absolute bottom-8 flex items-center gap-2 text-xs text-slate-600 ${exiting ? 'opacity-0' : 'opacity-100'} transition-all duration-300`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />
          Voice • Video • Screen Share • Multi-Agent
        </div>
      </div>
    </div>
  );
}
