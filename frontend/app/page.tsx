'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import VoiceSelector from '@/components/VoiceSelector';
import { MediaHandler } from '@/lib/media-handler';
import { GeminiClient } from '@/lib/gemini-client';

export default function HomePage() {
  const [showLanding, setShowLanding] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoVoice, setDemoVoice] = useState<string | null>(null);
  const [demoError, setDemoError] = useState(false);
  const router = useRouter();

  const demoPlayingRef = useRef(false);
  const mediaHandlerRef = useRef<MediaHandler | null>(null);
  const geminiClientRef = useRef<GeminiClient | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('expertmind-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (settings.voice) setSelectedVoice(settings.voice);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('expertmind-settings');
      const settings = saved ? JSON.parse(saved) : {};
      settings.voice = selectedVoice;
      localStorage.setItem('expertmind-settings', JSON.stringify(settings));
    } catch {}
  }, [selectedVoice]);

  useEffect(() => {
    return () => {
      if (geminiClientRef.current) geminiClientRef.current.disconnect();
      if (mediaHandlerRef.current) mediaHandlerRef.current.stopAudioPlayback();
    };
  }, []);

  const playDemo = async (voice: string) => {
    if (demoPlayingRef.current) return;
    demoPlayingRef.current = true;

    setDemoPlaying(true);
    setDemoVoice(voice);
    setDemoError(false);

    if (mediaHandlerRef.current) {
      mediaHandlerRef.current.stopAudioPlayback();
    }
    if (geminiClientRef.current) {
      geminiClientRef.current.disconnect();
    }

    const abort = new AbortController();
    abortRef.current = abort;
    const client = new GeminiClient();
    geminiClientRef.current = client;

    try {
      const handler = new MediaHandler();
      mediaHandlerRef.current = handler;
      await handler.initializeAudio();

      await client.connect((message) => {
        if (abort.signal.aborted) return;

        if (message.type === 'audio') {
          handler.playAudio(message.data);
          setTimeout(() => {
            if (!abort.signal.aborted) {
              client.disconnect();
              demoPlayingRef.current = false;
              setDemoPlaying(false);
            }
          }, 3500);
        } else if (message.type === 'error') {
          setDemoError(true);
          demoPlayingRef.current = false;
          setDemoPlaying(false);
          client.disconnect();
        }
      });

      client.sendSettings({
        voice,
        systemPrompt: 'You are ExpertMind AI. Respond with a very short greeting in Urdu.',
      });

      setTimeout(() => {
        if (!abort.signal.aborted) {
          client.disconnect();
          demoPlayingRef.current = false;
          setDemoPlaying(false);
          setDemoError(true);
        }
      }, 8000);
    } catch {
      if (!abort.signal.aborted) {
        setDemoError(true);
        demoPlayingRef.current = false;
        setDemoPlaying(false);
      }
    }
  };

  const handleVoiceSelect = (voice: string) => {
    setSelectedVoice(voice);
  };

  const handleStart = () => {
    setExiting(true);
    setTimeout(() => {
      setShowLanding(false);
      router.push('/session?connect=true');
    }, 600);
  };

  if (!showLanding) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-amethyst-dark">
      <div className="absolute inset-0 bg-gradient-to-br from-amethyst-dark via-amethyst-dark/20 to-amethyst-dark animate-gradient" />

      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Ambient floating particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Desktop particles */}
        {/* 1 — circle, top-left */}
        <div className="hidden md:block absolute top-[8%] left-[8%]">
          <div className="w-[10px] h-[10px] rounded-full bg-blue-400/40 blur-[2px] animate-particle-1 shadow-[0_0_12px_rgba(96,165,250,0.3)]" style={{ animationDuration: '14s' }} />
        </div>
        {/* 2 — plus, top-right */}
        <div className="hidden md:block absolute top-[12%] right-[12%]">
          <div className="animate-particle-2 flex items-center justify-center" style={{ width: '12px', height: '12px', animationDuration: '18s', filter: 'blur(1px)' }}>
            <div className="absolute w-[12px] h-[2px] rounded-full shadow-[0_0_6px_var(--color-glowing-magenta),0.4)]" style={{ background: 'var(--color-glowing-magenta)' }} />
            <div className="absolute w-[2px] h-[12px] rounded-full shadow-[0_0_6px_var(--color-glowing-magenta),0.4)]" style={{ background: 'var(--color-glowing-magenta)' }} />
          </div>
        </div>
        {/* 3 — diamond, mid-left */}
        <div className="hidden md:block absolute top-[42%] left-[5%]">
          <div className="w-[9px] h-[9px] rotate-45 bg-cyber-teal/50 blur-[1px] animate-particle-3 shadow-[0_0_10px_var(--color-cyber-teal),0.3)]" style={{ animationDuration: '16s' }} />
        </div>
        {/* 4 — circle, mid-right */}
        <div className="hidden md:block absolute top-[48%] right-[6%]">
          <div className="w-[8px] h-[8px] rounded-full bg-glowing-magenta/45 blur-[2px] animate-particle-4 shadow-[0_0_12px_var(--color-glowing-magenta),0.3)]" style={{ animationDuration: '20s' }} />
        </div>
        {/* 5 — plus, bottom-left */}
        <div className="hidden md:block absolute bottom-[22%] left-[12%]">
          <div className="animate-particle-2 flex items-center justify-center" style={{ width: '10px', height: '10px', animationDuration: '15s', filter: 'blur(1px)' }}>
            <div className="absolute w-[10px] h-[2px] rounded-full shadow-[0_0_6px_var(--color-cyber-teal),0.4)]" style={{ background: 'var(--color-cyber-teal)' }} />
            <div className="absolute w-[2px] h-[10px] rounded-full shadow-[0_0_6px_var(--color-cyber-teal),0.4)]" style={{ background: 'var(--color-cyber-teal)' }} />
          </div>
        </div>
        {/* 6 — diamond, bottom-right */}
        <div className="hidden md:block absolute bottom-[28%] right-[14%]">
          <div className="w-[8px] h-[8px] rotate-45 bg-glowing-magenta/45 blur-[1px] animate-particle-1 shadow-[0_0_10px_var(--color-glowing-magenta),0.3)]" style={{ animationDuration: '17s', animationDelay: '1s' }} />
        </div>
        {/* 7 — circle, top-center */}
        <div className="hidden md:block absolute top-[28%] left-[50%]">
          <div className="w-[11px] h-[11px] rounded-full bg-cyber-teal/40 blur-[2px] animate-particle-4 shadow-[0_0_14px_var(--color-cyber-teal),0.35)]" style={{ animationDuration: '22s', animationDelay: '0.5s' }} />
        </div>
        {/* 8 — plus, bottom-center */}
        <div className="hidden md:block absolute bottom-[15%] left-[46%]">
          <div className="animate-particle-3 flex items-center justify-center" style={{ width: '8px', height: '8px', animationDuration: '19s', animationDelay: '2s', filter: 'blur(1px)' }}>
            <div className="absolute w-[8px] h-[2px] rounded-full shadow-[0_0_6px_var(--color-glowing-magenta),0.35)]" style={{ background: 'var(--color-glowing-magenta)' }} />
            <div className="absolute w-[2px] h-[8px] rounded-full shadow-[0_0_6px_var(--color-glowing-magenta),0.35)]" style={{ background: 'var(--color-glowing-magenta)' }} />
          </div>
        </div>

        {/* Mobile particles */}
        <div className="md:hidden absolute top-[6%] left-[6%]">
          <div className="w-[7px] h-[7px] rounded-full bg-cyber-teal/40 blur-[1px] animate-particle-1 shadow-[0_0_8px_var(--color-cyber-teal),0.25)]" style={{ animationDuration: '12s' }} />
        </div>
        <div className="md:hidden absolute top-[10%] right-[8%]">
          <div className="animate-particle-2 flex items-center justify-center" style={{ width: '8px', height: '8px', animationDuration: '15s', filter: 'blur(1px)' }}>
            <div className="absolute w-[8px] h-[1.5px] rounded-full shadow-[0_0_5px_var(--color-cyber-teal),0.3)]" style={{ background: 'var(--color-cyber-teal)' }} />
            <div className="absolute w-[1.5px] h-[8px] rounded-full shadow-[0_0_5px_var(--color-cyber-teal),0.3)]" style={{ background: 'var(--color-cyber-teal)' }} />
          </div>
        </div>
        <div className="md:hidden absolute top-[38%] left-[5%]">
          <div className="w-[7px] h-[7px] rotate-45 bg-glowing-magenta/45 blur-[1px] animate-particle-3 shadow-[0_0_8px_var(--color-glowing-magenta),0.25)]" style={{ animationDuration: '14s' }} />
        </div>
        <div className="md:hidden absolute top-[42%] right-[7%]">
          <div className="w-[6px] h-[6px] rounded-full bg-cyber-teal/40 blur-[1px] animate-particle-4 shadow-[0_0_8px_var(--color-cyber-teal),0.25)]" style={{ animationDuration: '17s' }} />
        </div>
      </div>
      {/* Ethereal background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[60px] animate-ethereal-movement" style={{ animationDuration: '30s', animationDelay: '0s' }} />
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[50px] animate-ethereal-movement" style={{ animationDuration: '35s', animationDelay: '5s' }} />
        <div className="absolute top-[5%] right-[5%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[70px] animate-ethereal-movement" style={{ animationDuration: '40s', animationDelay: '10s' }} />
      </div>

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-amethyst-medium/20 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className={`mb-8 ${exiting ? 'opacity-0 scale-75' : 'opacity-100 scale-100'} transition-all duration-500`}>
          <Image src="/mind-logo.png" alt="ExpertMind" width={320} height={260} className="drop-shadow-xl w-[240px] h-[195px] md:w-[320px] md:h-[260px]" priority />
        </div>

        <button
          onClick={handleStart}
          className={`group relative px-8 py-4 bg-glowing-magenta hover:bg-glowing-magenta/80 text-white text-lg font-medium rounded-2xl transition-all duration-300 shadow-lg shadow-glowing-magenta/20 hover:shadow-glowing-magenta/30 hover:scale-105 ${exiting ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
        >
          <span className="relative z-10 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Session
          </span>
        </button>

        <div className={`mt-8 ${exiting ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'} transition-all duration-500 delay-150`}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <VoiceSelector
                currentVoice={selectedVoice}
                onSelect={handleVoiceSelect}
                onPreview={playDemo}
                previewingVoice={demoVoice}
                isPlaying={demoPlaying}
              />
              {demoPlaying && (
                <span className="flex items-center gap-1.5 text-xs text-cyber-teal animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-teal" />
                  Playing {demoVoice}
                </span>
              )}
              {demoError && !demoPlaying && (
                <span className="text-xs text-red-400">Demo unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-text-secondary tracking-widest uppercase">Choose your AI voice • Click ▶ to preview</span>
          </div>
        </div>

        <p className={`mt-6 text-sm text-text-secondary font-urdu ${exiting ? 'opacity-0' : 'opacity-100'} transition-all duration-300 delay-200`}>
          آپ کا ذہین ملٹی موڈل اے آئی کنسلٹنٹ
        </p>

        <div className={`mt-10 flex items-center gap-2 text-xs text-text-secondary ${exiting ? 'opacity-0' : 'opacity-100'} transition-all duration-300`}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-teal/50 animate-pulse" />
          Voice • Video • Screen Share • Multi-Agent
        </div>
      </div>
    </div>
  );
}
