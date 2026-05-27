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
    <div className="flex flex-col items-center p-4 space-y-4">
      <h1 className="text-2xl font-bold">Live Session</h1>

      <video ref={videoRef} autoPlay playsInline muted className="w-64 h-48 bg-gray-200" />

      <div className="flex space-x-2">
        <button onClick={handleConnect} className="p-2 bg-blue-500 text-white rounded">
          {isConnected ? 'Connected' : 'Connect'}
        </button>
        <button onClick={handleToggleRecording} className="p-2 bg-green-500 text-white rounded">
          {isRecording ? 'Stop Audio' : 'Start Audio'}
        </button>
        <button onClick={handleToggleCamera} className="p-2 bg-purple-500 text-white rounded">
          {isCameraOn ? 'Stop Camera' : 'Start Camera'}
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-yellow-500 text-white rounded">
          Settings
        </button>
        <button onClick={handleSummarize} className="p-2 bg-red-500 text-white rounded">
          Summarize
        </button>
      </div>

      <div className="flex w-full max-w-md space-x-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
          placeholder="Type your question here..."
          className="flex-1 p-2 border rounded text-black"
          disabled={!isConnected}
        />
        <button onClick={handleSendText} disabled={!isConnected} className="p-2 bg-blue-500 text-white rounded">
          Send
        </button>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded">
                <h2 className="text-lg font-bold">Settings</h2>
                <textarea value={settings.systemPrompt} onChange={e => setSettings({...settings, systemPrompt: e.target.value})} className="border w-full" />
                <select value={settings.voice} onChange={e => setSettings({...settings, voice: e.target.value})} className="border w-full">
                    <option value="Puck">Puck</option>
                    <option value="Charon">Charon</option>
                    <option value="Kore">Kore</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Aoede">Aoede</option>
                </select>
                <button onClick={() => saveSettings(settings)} className="bg-blue-500 text-white p-2">Save</button>
            </div>
        </div>
      )}

      <div className="w-full max-w-md h-64 overflow-y-auto border p-2 space-y-1">
        {messages.map((msg, i) => {
          if (msg.type === 'gemini') return <div key={i} className="text-green-300"><strong>AI:</strong> {msg.text}</div>;
          if (msg.type === 'user') return <div key={i} className="text-blue-300"><strong>آپ:</strong> {msg.text}</div>;
          if (msg.type === 'error') return <div key={i} className="text-red-400"><strong>Error:</strong> {msg.text}</div>;
          return null;
        })}
      </div>
    </div>
  );
};

export default LiveSession;
