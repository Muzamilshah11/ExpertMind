export interface ChatMessage {
  type: 'user' | 'gemini';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  voice: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const SESSIONS_KEY = 'expertmind-sessions';
const ACTIVE_KEY = 'expertmind-active-session';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveSessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function createSession(voice: string, firstMessage?: string): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    title: firstMessage ? firstMessage.slice(0, 50) : 'New Chat',
    voice,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: firstMessage ? [{ type: 'user', text: firstMessage, timestamp: Date.now() }] : [],
  };
  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  saveActiveSessionId(session.id);
  return session;
}

export function updateSessionMessages(sessionId: string, messages: ChatMessage[]): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx].messages = messages;
  sessions[idx].updatedAt = Date.now();
  if (sessions[idx].title === 'New Chat') {
    const firstUser = messages.find(m => m.type === 'user');
    if (firstUser) sessions[idx].title = firstUser.text.slice(0, 50);
  }
  saveSessions(sessions);
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx].messages.push(message);
  sessions[idx].updatedAt = Date.now();
  if (sessions[idx].title === 'New Chat' && message.type === 'user') {
    sessions[idx].title = message.text.slice(0, 50);
  }
  saveSessions(sessions);
}

export function deleteSession(sessionId: string): void {
  const sessions = loadSessions().filter(s => s.id !== sessionId);
  saveSessions(sessions);
  if (loadActiveSessionId() === sessionId) {
    saveActiveSessionId(sessions[0]?.id ?? null);
  }
}

export function getSession(sessionId: string): ChatSession | null {
  const sessions = loadSessions();
  return sessions.find(s => s.id === sessionId) ?? null;
}
