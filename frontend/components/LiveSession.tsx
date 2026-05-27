import React, { useRef, useState, useEffect } from 'react';
import { GeminiClient, SessionSettings } from '../lib/gemini-client';
import { MediaHandler } from '../lib/media-handler';

const LiveSession: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaHandler = useRef(new MediaHandler());
  const geminiClient = useRef(new GeminiClient());

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [messages, setMessages] = useState<{ type: string; text: string }[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [settings, setSettings] = useState<SessionSettings>({
    voice: 'Puck',
    systemPrompt: 'آپ ایک دوستانہ اور مددگار AI کنسلٹنٹ ہیں۔ براہ کرم صرف اردو میں بات کریں۔',
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('expertmind-settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));

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
  };

  const handleConnect = async () => {
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
      }
    });
    geminiClient.current.sendSettings(settings);
    setIsConnected(true);
    await mediaHandler.current.startAudio((data) => {
      geminiClient.current.sendAudio(data);
    });
    setIsRecording(true);
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
      await mediaHandler.current.startVideo(videoRef.current!, (frame) => {
        geminiClient.current.sendImage(frame);
      });
      setIsCameraOn(true);
    }
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
    setMessages((prev) => [...prev, { type: 'gemini', text: `Session summarized: ${data.session_id}` }]);
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

      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={handleConnect} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isConnected ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {isConnected ? '✅ Connected' : 'Connect'}
        </button>
        <button onClick={handleToggleRecording} disabled={!isConnected} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white disabled:opacity-40`}>
          {isRecording ? '⏹ Stop Mic' : '🎤 Start Mic'}
        </button>
        <button onClick={handleToggleCamera} disabled={!isConnected} className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isCameraOn ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'} text-white disabled:opacity-40`}>
          {isCameraOn ? '⏹ Stop Cam' : '📷 Start Cam'}
        </button>
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
          className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          disabled={!isConnected}
        />
        <button onClick={handleSendText} disabled={!isConnected} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all disabled:opacity-40">
          Send
        </button>
      </div>

      <div className="w-full max-w-md h-80 overflow-y-auto bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-700 shadow-lg">
        {messages.length === 0 && (
          <p className="text-slate-400 text-center">پیغامات یہاں ظاہر ہوں گے...</p>
        )}
        {messages.map((msg, i) => {
          if (msg.type === 'gemini') return (
            <div key={i} className="bg-slate-700/50 rounded-lg p-3">
              <span className="text-emerald-400 font-semibold text-sm">AI</span>
              <p className="text-white mt-1">{msg.text}</p>
            </div>
          );
          if (msg.type === 'user') return (
            <div key={i} className="bg-blue-900/30 rounded-lg p-3 border-l-4 border-blue-500">
              <span className="text-blue-300 font-semibold text-sm">آپ</span>
              <p className="text-white mt-1">{msg.text}</p>
            </div>
          );
          if (msg.type === 'error') return (
            <div key={i} className="bg-red-900/30 rounded-lg p-3 border-l-4 border-red-500">
              <span className="text-red-400 font-semibold text-sm">Error</span>
              <p className="text-red-200 mt-1">{msg.text}</p>
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
            <textarea value={settings.systemPrompt} onChange={e => setSettings({...settings, systemPrompt: e.target.value})} className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600 mb-4 h-24" />
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
    </div>
  );
};

export default LiveSession;
