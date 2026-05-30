# ExpertMind

ExpertMind is an elite multimodal AI consultant featuring real-time voice, video, and screen sharing powered by **Gemini Live API**. It combines a Next.js (Turbopack) frontend with a FastAPI backend for intelligent consulting sessions.

## Features

### 🎙 Real-Time Voice Chat
- WebSocket-based low-latency audio streaming
- 5 selectable AI voices: **Puck, Charon, Kore, Fenrir, Aoede**
- Voice switching dropdown in the controls bar
- Microphone mute/unmute via Three-Dot menu

### 📷 Camera & Screen Sharing
- Live camera preview with rounded floating overlay (top-right corner)
- Screen sharing with live preview (same overlay)
- Camera/Screen active indicator badges in TopBar
- Real-time frame capture (1 FPS) sent to Gemini for visual analysis
- Front/back camera support via `facingMode`

### 💬 Session History (localStorage)
- Conversations auto-saved in browser localStorage
- Slide-in history drawer with search functionality
- Auto-generated session titles from first user message
- Delete individual sessions or start new chat

### 🧠 Multi-Agent Orchestration
- LangGraph-powered agent pipeline:
  - Business Analyst, Tech Architect, Legal Compliance, Healthcare, Finance
- Structured JSON analysis output
- Automated solution merging across agents
- PDF report generation (via WeasyPrint)

### 🎨 Professional UI
- Slate-blue dark theme (slate-900/800/700 palette)
- Tailwind CSS with responsive layout
- Geist font + Urdu Nastaliq font support
- Scrollbar styling for chat area

## Project Structure

```
ExpertMind/
├── backend/
│   ├── main.py                 # FastAPI app, WebSocket endpoint, REST APIs
│   ├── gemini_live.py          # Gemini Live API session manager
│   ├── run.py                  # Backend entry point
│   ├── alembic/                # Database migrations
│   ├── src/
│   │   ├── agents/             # LangGraph agent definitions & flow
│   │   ├── services/           # PDF generator, etc.
│   │   ├── models.py           # SQLModel & Pydantic models
│   │   └── db.py               # Database connection pool
│   └── tests/                  # Backend tests
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout with fonts
│   │   ├── session/page.tsx    # Session route (SSR)
│   │   └── globals.css         # Global styles, Tailwind import
│   ├── components/
│   │   ├── LiveSession.tsx     # Main orchestrator component
│   │   ├── TopBar.tsx          # Header with hamburger, title, indicators
│   │   ├── BottomInput.tsx     # Text input, mic, attach, three-dots
│   │   ├── MessageBubble.tsx   # User/AI message rendering
│   │   ├── SessionHistory.tsx  # Slide-in drawer with search
│   │   ├── VoiceSelector.tsx   # Voice dropdown selector
│   │   └── ThreeDotMenu.tsx    # Camera/screen/mic popover menu
│   └── lib/
│       ├── gemini-client.ts    # WebSocket client with health checks
│       ├── media-handler.ts    # Audio/video/screen capture
│       └── session-storage.ts  # localStorage CRUD for sessions
├── .env                        # Environment variables
├── .gitignore
├── requirements.txt            # Python dependencies
├── package.json                # Root package.json
└── run_backend.py              # Backend startup script
```

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ (LTS)
- PostgreSQL (for agent pipeline features)
- Gemini API key

### 1. Clone & Install

```bash
git clone <repo-url>
cd ExpertMind

# Backend
python -m venv venv
.\venv\Scripts\activate    # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Environment Variables

Create `.env` in the project root:

```
GEMINI_API_KEY=your_key_here
MODEL=gemini-2.5-flash
LIVE_MODEL=gemini-3.1-flash-live-preview
DATABASE_URL=postgresql://user:pass@host:port/db
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Database Migrations

```bash
cd backend
alembic upgrade head
cd ..
```

## How to Run

### Start Backend

```bash
.\venv\Scripts\python run_backend.py
# → http://127.0.0.1:8000
```

### Start Frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `WebSocket` | `/ws` | Real-time session with Gemini Live |
| `POST` | `/api/summarize` | Summarize session transcript |
| `POST` | `/api/orchestrate` | Run multi-agent pipeline |
| `POST` | `/api/generate-pdf` | Generate PDF report |

## Session Flow

1. User opens `/session` page
2. Clicks **Connect** → frontend health-checks backend → WebSocket connects
3. Frontend sends settings (voice, system prompt) → backend starts Gemini Live session
4. Real-time bidirectional audio streaming begins
5. User can toggle camera/screen share to send visual frames
6. Conversations auto-save to browser localStorage
7. Voice can be changed mid-session (triggers session restart)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `MODEL` | No | `gemini-2.5-flash` | Text model for summarization |
| `LIVE_MODEL` | No | `gemini-3.1-flash-live-preview` | Live model for real-time sessions |
| `DATABASE_URL` | No* | — | PostgreSQL connection (required for agent pipeline) |
| `NEXT_PUBLIC_BACKEND_URL` | No | `http://localhost:8000` | Backend URL for frontend |

*Optional if only using real-time chat without agent pipeline.

## Known Issues

- **WeasyPrint**: PDF generation requires system libraries (Pango, Cairo, GDK-Pixbuf). See [WeasyPrint docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html) for installation.
- **API Key**: Valid `GEMINI_API_KEY` required for all AI functionality.
- **WebSocket**: Backend must be running on `localhost:8000`; frontend shows error if unreachable.
