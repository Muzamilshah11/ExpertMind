export interface SessionSettings {
  voice: string;
  systemPrompt: string;
}

export type GeminiMessage = 
  | { type: 'audio'; data: ArrayBuffer }
  | { type: 'gemini'; text: string }
  | { type: 'gemini_stream'; text: string }
  | { type: 'user'; text: string }
  | { type: 'error'; error: string }
  | { type: 'interrupted' }
  | { type: 'voice_changed'; voice: string }
  | { type: 'settings' }
  | { type: 'text'; data: string }
  | { type: 'image'; data: string };

export class GeminiClient {
  private ws: WebSocket | null = null;
  private backendUrl: string;
  private httpBase: string;

  constructor() {
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    if (envUrl) {
      this.httpBase = envUrl.replace(/\/$/, "");
      this.backendUrl = this.httpBase.replace('http://', 'ws://') + '/ws';
    } else {
      this.httpBase = "http://localhost:8000";
      this.backendUrl = "ws://localhost:8000/ws";
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.httpBase}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  connect(onMessage: (message: GeminiMessage) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error("Connection timed out. Is the backend running?"));
      }, 10000);

      this.ws = new WebSocket(this.backendUrl);
      this.ws.binaryType = "arraybuffer";
      this.ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === "string") {
          try {
            const parsed = JSON.parse(event.data) as GeminiMessage;
            onMessage(parsed);
          } catch (e) {
            console.error("Invalid JSON from server:", event.data, e);
          }
        } else {
          onMessage({ type: "audio", data: event.data as ArrayBuffer });
        }
      };
      this.ws.onopen = () => {
        clearTimeout(timeout);
        console.log("Connected to Gemini");
        resolve();
      };
      this.ws.onerror = () => {
        clearTimeout(timeout);
        console.error("WebSocket connection failed. Is the backend running on ws://localhost:8000 ?");
        reject(new Error("Failed to connect to backend WebSocket"));
      };
      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.code !== 1005) {
          console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
          onMessage({ type: "error", error: "Connection lost" });
        }
      };
    });
  }

  sendSettings(settings: SessionSettings) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "settings", data: settings }));
    }
  }

  sendAudio(pcmData: ArrayBuffer) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(pcmData);
  }

  sendImage(base64Image: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "image", data: base64Image }));
  }

  sendText(text: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "text", data: text }));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
