interface ThreeDotMenuProps {
  show: boolean;
  onClose: () => void;
  isCameraOn: boolean;
  isSharingScreen: boolean;
  isMicMuted: boolean;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onToggleMic: () => void;
  isConnected: boolean;
}

export default function ThreeDotMenu({
  show, onClose, isCameraOn, isSharingScreen, isMicMuted,
  onToggleCamera, onToggleScreen, onToggleMic, isConnected,
}: ThreeDotMenuProps) {
  if (!show) return null;

  const items = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: isCameraOn ? 'Stop Camera' : 'Start Camera',
      onClick: onToggleCamera,
      disabled: !isConnected,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: isSharingScreen ? 'Stop Share' : 'Share Screen',
      onClick: onToggleScreen,
      disabled: !isConnected,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      label: isMicMuted ? 'Unmute Mic' : 'Mute Mic',
      onClick: onToggleMic,
      disabled: !isConnected,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-20 right-4 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 min-w-[200px]">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { try { item.onClick(); } catch {} onClose(); }}
            disabled={item.disabled}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-200 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-slate-400">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
