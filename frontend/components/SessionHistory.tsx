import type { ChatSession } from '../lib/session-storage';

interface SessionHistoryProps {
  show: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export default function SessionHistory({
  show, onClose, sessions, activeSessionId,
  onSelectSession, onNewChat, onDeleteSession,
}: SessionHistoryProps) {
  return (
    <>
      {show && <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40" onClick={onClose} />}

      <div className={`fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 shadow-2xl ${show ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-slate-100 font-semibold text-sm">History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-110px)] px-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-8">No conversations yet</p>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => { onSelectSession(s.id); onClose(); }}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                s.id === activeSessionId ? 'bg-slate-800' : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{(s.title[0] || '?').toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm truncate">{s.title}</p>
                <p className="text-slate-500 text-xs">
                  {new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-700 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
