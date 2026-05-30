import VoiceSelector from "./VoiceSelector";

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  onNewChat: () => void;
  isConnected: boolean;
  isCameraOn?: boolean;
  isSharingScreen?: boolean;
  currentVoice: string;
  onVoiceChange: (voice: string) => void;
  onConnect?: () => void;
  isConnecting?: boolean;
}

export default function TopBar({ title, onMenuClick, onNewChat, isConnected, isCameraOn, isSharingScreen, currentVoice, onVoiceChange, onConnect, isConnecting }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
      <button onClick={onMenuClick} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-600'}`} />
        <h1 className="text-slate-100 font-semibold text-sm truncate max-w-[180px]">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {!isConnected && onConnect && (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        )}
        <VoiceSelector currentVoice={currentVoice} onSelect={onVoiceChange} />
        {isCameraOn && (
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Camera
          </span>
        )}
        {isSharingScreen && (
          <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Screen
          </span>
        )}
        <button onClick={onNewChat} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
