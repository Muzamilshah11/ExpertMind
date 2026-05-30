interface BottomInputProps {
  textInput: string;
  onTextChange: (val: string) => void;
  onSend: () => void;
  onMicClick: () => void;
  onAttachClick: () => void;
  onThreeDotClick: () => void;
  isRecording: boolean;
  disabled: boolean;
}

export default function BottomInput({
  textInput, onTextChange, onSend, onMicClick, onAttachClick, onThreeDotClick,
  isRecording, disabled,
}: BottomInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900 px-3 py-3">
      <div className="flex items-end gap-2 bg-slate-800 rounded-2xl border border-slate-700 px-3 py-2">
        <button
          onClick={onAttachClick}
          disabled={disabled}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <textarea
          value={textInput}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message ExpertMind..."
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none resize-none max-h-32 py-1.5 disabled:opacity-30"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />

        <div className="flex items-center gap-1">
          <button
            onClick={onMicClick}
            disabled={disabled}
            className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'} disabled:opacity-30`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button
            onClick={onThreeDotClick}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
