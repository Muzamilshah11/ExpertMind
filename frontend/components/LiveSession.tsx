import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GeminiClient, SessionSettings } from '../lib/gemini-client';
import { MediaHandler } from '../lib/media-handler';
import {
  loadSessions, loadActiveSessionId, saveActiveSessionId,
  createSession, appendMessage, deleteSession, getSession,
} from '../lib/session-storage';
import type { ChatMessage, ChatSession } from '../lib/session-storage';
import TopBar from './TopBar';
import MessageBubble from './MessageBubble';
import BottomInput from './BottomInput';
import ThreeDotMenu from './ThreeDotMenu';
import VoiceSelector from './VoiceSelector';
import SessionHistory from './SessionHistory';

const DEFAULT_SETTINGS: SessionSettings = {
  voice: 'Puck',
  systemPrompt: 'You are a friendly and helpful AI consultant. Respond in English. Keep answers concise and useful.',
};

export default function LiveSession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaHandler = useRef(new MediaHandler());
  const geminiClient = useRef(new GeminiClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadActiveSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const id = loadActiveSessionId();
    return id ? getSession(id)?.messages ?? [] : [];
  });
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [showHistory, setShowHistory] = useState(false);
  const [showThreeDot, setShowThreeDot] = useState(false);
  const [settings, setSettings] = useState<SessionSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem('expertmind-settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      mediaHandler.current.stopAudio();
      mediaHandler.current.stopVideo(videoRef.current);
      geminiClient.current.disconnect();
    };
  }, []);

  const onMessage = useCallback((message: import('../lib/gemini-client').GeminiMessage) => {
    if (message.type === 'audio') {
      mediaHandler.current.playAudio(new Uint8Array(message.data).buffer);
    } else if (message.type === 'gemini' && message.text) {
      const msg: ChatMessage = { type: 'gemini', text: message.text, timestamp: Date.now() };
      setMessages(prev => [...prev, msg]);
      if (activeSessionId) appendMessage(activeSessionId, msg);
    } else if (message.type === 'user' && message.text) {
      const msg: ChatMessage = { type: 'user', text: message.text, timestamp: Date.now() };
      setMessages(prev => [...prev, msg]);
      if (activeSessionId) appendMessage(activeSessionId, msg);
    } else if (message.type === 'error') {
      if (message.error === 'Connection lost') {
        setIsConnected(false);
        setIsRecording(false);
        setConnectionError('Connection lost. Please reconnect.');
      } else {
        setMessages(prev => [...prev, { type: 'gemini', text: `Error: ${message.error}`, timestamp: Date.now() }]);
      }
    } else if (message.type === 'interrupted') {
      mediaHandler.current.stopAudioPlayback();
    } else if (message.type === 'voice_changed') {
      mediaHandler.current.stopAudioPlayback();
      setMessages(prev => [...prev, { type: 'gemini', text: `Voice switched to ${message.voice}`, timestamp: Date.now() }]);
    }
  }, [activeSessionId]);

  const handleConnect = async () => {
    setConnectionError('');
    setIsConnecting(true);
    try {
      const healthy = await geminiClient.current.healthCheck();
      if (!healthy) {
        throw new Error('Backend not reachable');
      }
      await mediaHandler.current.initializeAudio();
      await geminiClient.current.connect(onMessage);
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

  const handleDisconnect = () => {
    if (isRecording) mediaHandler.current.stopAudio();
    if (isCameraOn) mediaHandler.current.stopVideo(videoRef.current);
    geminiClient.current.disconnect();
    setIsConnected(false);
    setIsRecording(false);
    setIsCameraOn(false);
    setIsSharingScreen(false);
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
      try {
        await mediaHandler.current.startVideo(videoRef.current!, (frame) => {
          geminiClient.current.sendImage(frame);
        }, 'user');
        setIsCameraOn(true);
      } catch {
        setConnectionError('Camera failed to start. Check permissions.');
      }
    }
  };

  const handleToggleScreen = async () => {
    if (isSharingScreen) {
      mediaHandler.current.stopVideo(videoRef.current);
      setIsSharingScreen(false);
    } else {
      try {
        await mediaHandler.current.startScreen(videoRef.current!, (frame) => {
          geminiClient.current.sendImage(frame);
        }, () => setIsSharingScreen(false));
        if (isCameraOn) {
          mediaHandler.current.stopVideo(videoRef.current);
          setIsCameraOn(false);
        }
        setIsSharingScreen(true);
      } catch {
        setConnectionError('Screen share failed to start.');
      }
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      mediaHandler.current.stopAudio();
      setIsRecording(false);
      setIsMicMuted(true);
    } else {
      handleToggleRecording();
      setIsMicMuted(false);
    }
  };

  const handleSendText = () => {
    if (!textInput.trim() || !isConnected) return;

    if (!activeSessionId) {
      const session = createSession(settings.voice, textInput);
      setActiveSessionId(session.id);
      setMessages(session.messages);
      setSessions(loadSessions());
      geminiClient.current.sendText(textInput);
      setTextInput('');
      return;
    }

    geminiClient.current.sendText(textInput);
    const msg: ChatMessage = { type: 'user', text: textInput, timestamp: Date.now() };
    setMessages(prev => [...prev, msg]);
    appendMessage(activeSessionId, msg);
    setSessions(loadSessions());
    setTextInput('');
  };

  const handleVoiceChange = (voice: string) => {
    const newSettings = { ...settings, voice };
    setSettings(newSettings);
    localStorage.setItem('expertmind-settings', JSON.stringify(newSettings));
    if (isConnected) {
      geminiClient.current.sendSettings(newSettings);
    }
  };

  const handleNewChat = () => {
    const session = createSession(settings.voice);
    setActiveSessionId(session.id);
    setMessages([]);
    setSessions(loadSessions());
    saveActiveSessionId(session.id);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    saveActiveSessionId(id);
    const session = getSession(id);
    if (session) setMessages(session.messages);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setSessions(loadSessions());
    if (activeSessionId === id) {
      const remaining = loadSessions();
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  };

  const handleAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (file.type.startsWith('image/') && isConnected) {
          const base64 = (reader.result as string).split(',')[1];
          geminiClient.current.sendImage(base64);
        } else if (isConnected) {
          geminiClient.current.sendText(`[Attached: ${file.name}]`);
        }
      };
      if (file.type.startsWith('image/')) reader.readAsDataURL(file);
      else reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      <SessionHistory
        show={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      <TopBar
        title={activeSessionId ? getSession(activeSessionId)?.title || 'New Chat' : 'ExpertMind'}
        onMenuClick={() => setShowHistory(true)}
        onNewChat={handleNewChat}
        isConnected={isConnected}
        isCameraOn={isCameraOn}
        isSharingScreen={isSharingScreen}
      />

      {connectionError && (
        <div className="mx-4 mt-2 bg-red-900/40 border border-red-800 text-red-300 rounded-lg p-2.5 text-xs text-center">
          {connectionError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {!isConnected && messages.length === 0 && !isConnecting && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-slate-100 text-lg font-semibold mb-2">ExpertMind</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">Your multimodal AI consultant. Connect to start a conversation.</p>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        )}

        {isConnecting && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Connecting...</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} type={msg.type} text={msg.text} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        {isConnected && (
          <div className="flex items-center justify-center gap-2 pb-2 px-4">
            <button
              onClick={handleToggleCamera}
              className={`p-2 rounded-xl transition-all ${isCameraOn ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              title="Camera"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleToggleScreen}
              className={`p-2 rounded-xl transition-all ${isSharingScreen ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              title="Screen Share"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <VoiceSelector currentVoice={settings.voice} onSelect={handleVoiceChange} />
            <button
              onClick={handleDisconnect}
              className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-slate-700/50 transition-all"
              title="Disconnect"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <BottomInput
          textInput={textInput}
          onTextChange={setTextInput}
          onSend={handleSendText}
          onMicClick={handleToggleRecording}
          onAttachClick={handleAttach}
          onThreeDotClick={() => setShowThreeDot(!showThreeDot)}
          isRecording={isRecording}
          disabled={!isConnected}
        />

        <ThreeDotMenu
          show={showThreeDot}
          onClose={() => setShowThreeDot(false)}
          isCameraOn={isCameraOn}
          isSharingScreen={isSharingScreen}
          isMicMuted={isMicMuted}
          onToggleCamera={handleToggleCamera}
          onToggleScreen={handleToggleScreen}
          onToggleMic={toggleMic}
          isConnected={isConnected}
        />
      </div>

      <div className={`fixed top-16 right-4 z-50 rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-300 ${(isCameraOn || isSharingScreen) ? 'opacity-100 scale-100 border-slate-700/50' : 'opacity-0 scale-95 border-transparent pointer-events-none'}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-40 h-52 object-cover bg-black" />
        {(isCameraOn || isSharingScreen) && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${isCameraOn ? 'bg-green-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`} />
            {isCameraOn ? 'Camera' : 'Screen Share'}
          </div>
        )}
      </div>
    </div>
  );
}
