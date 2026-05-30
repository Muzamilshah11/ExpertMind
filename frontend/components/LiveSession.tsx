import React, { useRef, useState, useEffect } from 'react';
import { GeminiClient, SessionSettings } from '../lib/gemini-client';
import { MediaHandler } from '../lib/media-handler';

interface ReportData {
  session_id: string;
  executive_summary: string;
  implementation_roadmap: string[];
  agent_outputs: Record<string, unknown>;
  final_spec: Record<string, unknown>;
  summary: string;
}

const LiveSession: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaHandler = useRef(new MediaHandler());
  const geminiClient = useRef(new GeminiClient());
  const reportRef = useRef<HTMLDivElement>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraFront, setIsCameraFront] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [messages, setMessages] = useState<{ type: string; text: string }[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [settings, setSettings] = useState<SessionSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expertmind-settings');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return {
      voice: 'Puck',
      systemPrompt: 'آپ ایک دوستانہ اور مددگار AI کنسلٹنٹ ہیں۔ صرف اردو میں بات کریں اور جواب دیں۔ صارف ہندی، اردو، یا کسی بھی دوسری زبان میں بات کر سکتا ہے — آپ کا کام صرف اردو رسم الخط میں جواب دینا اور ریکارڈ رکھنا ہے۔',
    };
  });

  const [showPdfPrompt, setShowPdfPrompt] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    return () => {
      mediaHandler.current.stopAudio();
      mediaHandler.current.stopVideo(videoRef.current);
      geminiClient.current.disconnect();
      setIsSharingScreen(false);
    };
  }, []);

  const saveSettings = (newSettings: SessionSettings) => {
    setSettings(newSettings);
    localStorage.setItem('expertmind-settings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
    if (isConnected) {
      geminiClient.current.sendSettings(newSettings);
    }
  };

  const handleConnect = async () => {
    setConnectionError('');
    setIsConnecting(true);
    try {
      await mediaHandler.current.initializeAudio();
      await geminiClient.current.connect((message) => {
        if (message.type === 'audio') {
          mediaHandler.current.playAudio(new Uint8Array(message.data).buffer);
        } else if (message.type === 'gemini' && message.text) {
          setMessages((prev) => [...prev, { type: 'gemini', text: message.text }]);
        } else if (message.type === 'user' && message.text) {
          setMessages((prev) => [...prev, { type: 'user', text: message.text }]);
        } else if (message.type === 'error') {
          setMessages((prev) => [...prev, { type: 'error', text: message.error }]);
      } else if (message.type === 'interrupted') {
        mediaHandler.current.stopAudioPlayback();
      } else if (message.type === 'voice_changed') {
        mediaHandler.current.stopAudioPlayback();
        setMessages((prev) => [...prev, { type: 'gemini', text: `Voice switched to ${message.voice}` }]);
      }
      });
      geminiClient.current.sendSettings(settings);
      setIsConnected(true);
      await mediaHandler.current.startAudio((data) => {
        geminiClient.current.sendAudio(data);
      });
      setIsRecording(true);
    } catch {
      setConnectionError('Cannot connect to backend. Make sure the server is running on http://localhost:8000');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaHandler.current.stopAudio();
      setIsRecording(false);
    } else {
      await mediaHandler.current.startAudio((data) => {
        geminiClient.current.sendAudio(data);
      });
      setIsRecording(true);
    }
  };

  const handleToggleCamera = async () => {
    if (isCameraOn) {
      mediaHandler.current.stopVideo(videoRef.current);
      setIsCameraOn(false);
    } else {
      setIsCameraFront(true);
      await mediaHandler.current.startVideo(videoRef.current!, (frame) => {
        geminiClient.current.sendImage(frame);
      }, 'user');
      setIsCameraOn(true);
    }
  };

  const handleSwitchCamera = async () => {
    const newFacing = isCameraFront ? 'environment' : 'user';
    mediaHandler.current.stopVideo(videoRef.current);
    await mediaHandler.current.startVideo(videoRef.current!, (frame) => {
      geminiClient.current.sendImage(frame);
    }, newFacing);
    setIsCameraFront(!isCameraFront);
  };

  const handleToggleScreen = async () => {
    if (isSharingScreen) {
      mediaHandler.current.stopVideo(videoRef.current);
      setIsSharingScreen(false);
    } else {
      if (isCameraOn) {
        mediaHandler.current.stopVideo(videoRef.current);
        setIsCameraOn(false);
      }
      await mediaHandler.current.startScreen(videoRef.current!, (frame) => {
        geminiClient.current.sendImage(frame);
      }, () => {
        setIsSharingScreen(false);
      });
      setIsSharingScreen(true);
    }
  };

  const handleSummarize = async () => {
    const transcript = messages.map(m => `${m.type}: ${m.text}`).join('\n');
    const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            session_transcript: transcript,
            session_duration: 0,
            user_id: '00000000-0000-0000-0000-000000000000'
        })
    });
    const data = await response.json();
    setCurrentSessionId(data.session_id);
    setMessages((prev) => [...prev, { type: 'gemini', text: `Session summarized: ${data.session_id}` }]);
    setShowPdfPrompt(true);
  };

  const handleGenerateReport = async () => {
    setIsLoadingReport(true);
    setShowPdfPrompt(false);
    setReportError('');

    try {
      const orchResponse = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId }),
      });
      if (!orchResponse.ok) throw new Error('Orchestration failed');
      const orchData = await orchResponse.json();

      setReportData({
        session_id: orchData.session_id,
        executive_summary: orchData.executive_summary || 'No executive summary available.',
        implementation_roadmap: orchData.implementation_roadmap || [],
        agent_outputs: orchData.agent_outputs || {},
        final_spec: orchData.final_spec || {},
        summary: orchData.executive_summary || '',
      });

      setShowReport(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 300);
  };

  const handleSendText = () => {
    if (!textInput.trim() || !isConnected) return;
    geminiClient.current.sendText(textInput);
    setMessages((prev) => [...prev, { type: 'user', text: textInput }]);
    setTextInput('');
  };

  return (
    <div className="flex flex-col items-center p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white">ExpertMind Live Session</h1>

      <div className="w-full max-w-md bg-slate-800 rounded-xl p-4 shadow-lg relative">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-48 bg-slate-700 rounded-lg object-cover" />
        {isSharingScreen && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Screen Share Active
          </div>
        )}
        {isCameraOn && !isSharingScreen && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
            Camera Active
          </div>
        )}
      </div>

      {connectionError && (
        <div className="w-full max-w-md bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-3 text-sm text-center">
          {connectionError}
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={handleConnect} disabled={isConnecting} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isConnected ? 'bg-emerald-600 text-white' : isConnecting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {isConnecting ? 'Connecting...' : isConnected ? '✅ Connected' : 'Connect'}
        </button>
        <button onClick={handleToggleRecording} disabled={!isConnected} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white disabled:opacity-40`}>
          {isRecording ? '⏹ Stop Mic' : '🎤 Start Mic'}
        </button>
        <button onClick={handleToggleCamera} disabled={!isConnected} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isCameraOn ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'} text-white disabled:opacity-40`}>
          {isCameraOn ? '⏹ Stop Cam' : '📷 Start Cam'}
        </button>
        {isCameraOn && (
          <button onClick={handleSwitchCamera} disabled={!isConnected} className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-all disabled:opacity-40">
            🔄 {isCameraFront ? 'Back' : 'Front'}
          </button>
        )}
        <button onClick={handleToggleScreen} disabled={!isConnected} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isSharingScreen ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white disabled:opacity-40`}>
          {isSharingScreen ? '⏹ Stop Share' : '🖥 Share Screen'}
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-all">
          ⚙ Settings
        </button>
        <button onClick={handleSummarize} disabled={!isConnected} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-all disabled:opacity-40">
          📋 Summarize
        </button>
      </div>

      <div className="flex w-full max-w-md gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
          placeholder="یہاں اپنا سوال لکھیں..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 font-urdu"
          disabled={!isConnected}
        />
        <button onClick={handleSendText} disabled={!isConnected} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all disabled:opacity-40">
          Send
        </button>
      </div>

      <div className="w-full max-w-md h-80 overflow-y-auto bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-700 shadow-lg">
        {messages.length === 0 && (
          <p className="text-slate-400 text-center font-urdu">پیغامات یہاں ظاہر ہوں گے...</p>
        )}
        {messages.map((msg, i) => {
          if (msg.type === 'gemini') return (
            <div key={i} className="bg-slate-700/50 rounded-lg p-3">
              <span className="text-emerald-400 font-semibold text-sm">AI</span>
              <p className="text-white mt-1 font-urdu leading-relaxed">{msg.text}</p>
            </div>
          );
          if (msg.type === 'user') return (
            <div key={i} className="bg-blue-900/30 rounded-lg p-3 border-l-4 border-blue-500">
              <span className="text-blue-300 font-semibold text-sm">You</span>
              <p className="text-white mt-1 font-urdu leading-relaxed">{msg.text}</p>
            </div>
          );
          if (msg.type === 'error') return (
            <div key={i} className="bg-red-900/30 rounded-lg p-3 border-l-4 border-red-500">
              <span className="text-red-400 font-semibold text-sm">Error</span>
              <p className="text-red-200 mt-1 font-urdu leading-relaxed">{msg.text}</p>
            </div>
          );
          return null;
        })}
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
            <label className="block text-sm text-slate-300 mb-1">System Prompt</label>
            <textarea value={settings.systemPrompt} onChange={e => setSettings({...settings, systemPrompt: e.target.value})} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 mb-4 h-24 font-urdu" />
            <label className="block text-sm text-slate-300 mb-1">Voice</label>
            <select value={settings.voice} onChange={e => setSettings({...settings, voice: e.target.value})} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 mb-4">
              <option value="Puck">Puck</option>
              <option value="Charon">Charon</option>
              <option value="Kore">Kore</option>
              <option value="Fenrir">Fenrir</option>
              <option value="Aoede">Aoede</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => saveSettings(settings)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg font-medium">Save</button>
              <button onClick={() => setIsSettingsOpen(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPdfPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">PDF Report</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Kya aap is session ki complete report download karna chahte hain?
            </p>
            {reportError && (
              <p className="text-red-500 text-sm mb-4">{reportError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={isLoadingReport}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-3 px-4 rounded-xl font-semibold transition-all"
              >
                {isLoadingReport ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  'Haan, Download karein'
                )}
              </button>
              <button
                onClick={() => { setShowPdfPrompt(false); setReportError(''); }}
                disabled={isLoadingReport}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Nahi
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && reportData && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto" ref={reportRef}>
          <style>{`
            @media print {
              @page { margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              .report-section { page-break-inside: avoid; }
            }
          `}</style>

          {/* Print/Close toolbar */}
          <div className="no-print sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
            <h1 className="text-lg font-bold text-gray-800">ExpertMind Report</h1>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Download PDF
              </button>
              <button onClick={() => setShowReport(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-all">
                Close
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 text-gray-900">
            {/* Cover */}
            <div className="text-center py-12 sm:py-20 border-b-2 border-blue-600 mb-8 report-section">
              <h1 className="text-3xl sm:text-4xl font-bold text-blue-700 mb-3">ExpertMind Report</h1>
              <p className="text-gray-500 text-sm">Session ID: {reportData.session_id}</p>
              <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Executive Summary */}
            <div className="mb-8 report-section">
              <h2 className="text-xl font-bold text-blue-700 border-b border-blue-200 pb-2 mb-4">1. Executive Summary</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{reportData.executive_summary}</p>
            </div>

            {/* Agent Findings */}
            {Object.keys(reportData.agent_outputs).length > 0 && (
              <div className="mb-8 report-section">
                <h2 className="text-xl font-bold text-blue-700 border-b border-blue-200 pb-2 mb-4">2. Agent Analysis</h2>
                {Object.entries(reportData.agent_outputs).map(([agent, output]) => (
                  <div key={agent} className="mb-6 bg-gray-50 rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize">
                      {agent.replace(/_/g, ' ')}
                    </h3>
                    {typeof output === 'object' && output !== null ? (
                      <div className="space-y-3">
                        {Object.entries(output).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-sm font-medium text-gray-500 capitalize mb-1">
                              {key.replace(/_/g, ' ')}
                            </p>
                            {Array.isArray(val) ? (
                              <ul className="list-disc list-inside text-gray-700 space-y-1">
                                {val.map((item: string, i: number) => (
                                  <li key={i} className="text-sm sm:text-base">{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-gray-700 text-sm sm:text-base">{String(val)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-700 text-sm sm:text-base">{String(output)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Implementation Roadmap */}
            {reportData.implementation_roadmap.length > 0 && (
              <div className="mb-8 report-section">
                <h2 className="text-xl font-bold text-blue-700 border-b border-blue-200 pb-2 mb-4">
                  {Object.keys(reportData.agent_outputs).length > 0 ? '3' : '2'}. Implementation Roadmap
                </h2>
                <ol className="space-y-3">
                  {reportData.implementation_roadmap.map((step: string, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-gray-700 leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-400 text-xs border-t border-gray-200 pt-6 mt-8">
              Generated by ExpertMind AI · {new Date().toLocaleDateString('en-PK')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSession;
