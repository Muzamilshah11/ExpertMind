import { useState } from 'react';

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

interface VoiceSelectorProps {
  currentVoice: string;
  onSelect: (voice: string) => void;
}

export default function VoiceSelector({ currentVoice, onSelect }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        {currentVoice}
        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 right-0 z-20 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 min-w-[140px]">
            {VOICES.map(v => (
              <button
                key={v}
                onClick={() => { onSelect(v); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${
                  currentVoice === v
                    ? 'text-blue-400 bg-slate-800'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentVoice === v ? 'bg-blue-500' : 'bg-slate-600'}`} />
                {v}
                {currentVoice === v && (
                  <svg className="w-3.5 h-3.5 ml-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
