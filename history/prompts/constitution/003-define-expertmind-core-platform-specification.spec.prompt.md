---
id: 003
title: Define ExpertMind Core Platform Specification
stage: spec
date: 2026-05-26
surface: agent
model: gemini-2.0-flash-exp
feature: expertmind-core-platform
branch: master
user: Muzammil Shah
command: /SP.SPECIFY
labels: ["core-platform", "specification", "frontend", "backend", "langgraph", "database", "pdf-generation"]
links:
  spec: specs/expertmind/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/expertmind/spec.md
tests:
 []
---

## Prompt

/SP.SPECIFY

PROJECT NAME : ExpertMind
VERSION      : 1.0.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXISTING FILES (already in project)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backend/gemini_live.py
  → GeminiLive class, async session management
  → 3 input queues: audio, video, text
  → audio_output_callback for PCM response streaming
  → Handles: transcription, tool_call, interrupted,
    turn_complete, go_away events
  → DO NOT MODIFY this file

backend/main.py
  → FastAPI app with /ws WebSocket endpoint
  → Handles: settings payload, image (base64 JPEG),
    audio (raw bytes), text messages
  → audio_output_callback → websocket.send_bytes()
  → ADD new REST endpoints here: /api/summarize,
    /api/orchestrate, /api/generate-pdf

frontend/public/pcm-processor.js
  → AudioWorklet PCM processor (4096 buffer)
  → Loaded via: audioContext.audioWorklet.addModule()
  → DO NOT MODIFY this file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend : Next.js 14 (App Router), React 18,
           TypeScript 5, Tailwind CSS 3
Backend  : Python 3.11+, FastAPI (existing),
           LangGraph 0.2+, Google GenAI SDK (existing)
Database : Neon DB (Serverless PostgreSQL), Prisma ORM
PDF      : WeasyPrint (Python)
Deploy   : Vercel (frontend), Railway (backend)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 1 — NEXT.JS FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Port these from existing vanilla JS files:

FILE: lib/gemini-client.ts
  Port from: gemini-client.js (GeminiClient class)
  Changes:
    - TypeScript interfaces for all message types
    - Settings payload: { type, voice, systemPrompt }
    - Image payload: { type:"image", data:base64 }
    - Binary send for PCM audio bytes
    - onOpen / onMessage / onClose / onError callbacks

FILE: lib/media-handler.ts
  Port from: media-handler.js (MediaHandler class)
  Changes:
    - TypeScript class with proper types
    - initializeAudio(): loads pcm-processor.js from
      /pcm-processor.js (public folder)
    - startAudio(onAudioData): getUserMedia, AudioWorklet,
      downsample to 16kHz, convert Float32→Int16
    - startVideo(videoEl, onFrame): getUserMedia,
      setInterval 1 FPS, captureFrame 640x480 JPEG 0.7
    - startScreen(videoEl, onFrame, onEnded): getDisplayMedia
    - stopAudio() / stopVideo() / stopAudioPlayback()
    - playAudio(arrayBuffer): Int16→Float32, schedule
      at 24000Hz sample rate via AudioContext

FILE: components/LiveSession.tsx
  New React component replacing index.html + main.js
  Features:
    - useRef for videoPreview, audioContext
    - useState for: isConnected, isRecording,
      isCameraOn, messages[], sessionEnded
    - On connect: init audio → geminiClient.connect()
      → sendSettings({ voice, systemPrompt })
    - Render: video preview, mic/camera/screen buttons,
      chat log (user + gemini message bubbles),
      text input + send button, disconnect button
    - Settings modal: systemPrompt textarea,
      voice select (Puck/Charon/Kore/Fenrir/Aoede)
    - On session end: show summarize button →
      POST transcript to /api/summarize

FILE: app/page.tsx       → Landing / connect screen
FILE: app/session/page.tsx → Renders LiveSession.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 2 — SUMMARIZATION (ADD to main.py)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENDPOINT: POST /api/summarize
INPUT:
  session_transcript : str  (collected from
    input_transcription + output_transcription events)
  session_duration   : int  (seconds)
  user_id            : str  (UUID)

PROCESS:
  1. Build Gemini prompt with transcript
  2. Call genai.Client (already initialized in main.py)
  3. Extract structured JSON via Pydantic validation
  4. Write to Neon DB table: session_summaries
  5. Return: { session_id, status: "summarized" }

OUTPUT JSON SCHEMA (Pydantic model):
  session_id              : UUID
  user_id                 : UUID
  core_problem            : str
  business_context        : str
  technical_constraints   : list[str]
  regulatory_requirements : list[str]
  success_criteria        : list[str]
  detected_domains        : list[str]
  extracted_artifacts     : list[str]
  confidence_score        : float (0.0–1.0)
  created_at              : datetime

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 3 — NEON DB SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABLE: users
  id         UUID PK DEFAULT gen_random_uuid()
  email      TEXT UNIQUE NOT NULL
  full_name  TEXT
  plan       TEXT DEFAULT 'trial'
  created_at TIMESTAMPTZ DEFAULT now()

TABLE: session_summaries
  id                      UUID PK
  user_id                 UUID FK → users(id)
  core_problem            TEXT NOT NULL
  business_context        TEXT
  technical_constraints   JSONB
  regulatory_requirements JSONB
  success_criteria        JSONB
  detected_domains        TEXT[]
  extracted_artifacts     JSONB
  confidence_score        NUMERIC(3,2)
  langgraph_state         JSONB
  pdf_url                 TEXT
  status                  TEXT DEFAULT 'pending'
  created_at              TIMESTAMPTZ DEFAULT now()
  updated_at              TIMESTAMPTZ DEFAULT now()

TABLE: agent_runs
  id             UUID PK
  session_id     UUID FK → session_summaries(id)
  agent_name     TEXT NOT NULL
  input_context  JSONB
  output_result  JSONB
  iteration      INT DEFAULT 1
  status         TEXT DEFAULT 'running'
  created_at     TIMESTAMPTZ DEFAULT now()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 4 — LANGGRAPH ENGINE (new file)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE: backend/agents/langgraph_flow.py

ENDPOINT (in main.py): POST /api/orchestrate
INPUT: { session_id: str }

NODES:
  1. context_loader    → fetch summary from Neon DB
  2. master_router     → read detected_domains,
                         decide agent list
  3. business_analyst  → business model, risks,
                         stakeholders
  4. tech_architect    → system design, stack,
                         integrations
  5. legal_compliance  → regulatory flags
  6. solution_merger   → merge all agent outputs
  7. validator         → complete? re-route if not
                         (max 5 iterations)
  8. spec_generator    → produce sp.constitution
                         + sp.specify from state
  9. pdf_trigger       → POST to /api/generate-pdf

STATE (TypedDict):
  session_id      : str
  summary         : dict
  active_agents   : list[str]
  agent_outputs   : dict[str, dict]
  merged_solution : dict
  iteration_count : int
  is_validated    : bool
  final_spec      : dict
  pdf_url         : str

TERMINATION:
  is_validated == True OR iteration_count >= 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE 5 — PDF SERVICE (new file)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE: backend/services/pdf_generator.py

ENDPOINT (in main.py): POST /api/generate-pdf
INPUT: final LangGraph state dict
PROCESS:
  1. Inject state into HTML Jinja2 template
  2. WeasyPrint: HTML → PDF bytes
  3. Upload to cloud storage
  4. Update session_summaries.pdf_url in Neon DB
  5. Return: { pdf_url: str }

PDF SECTIONS:
  Cover Page, Executive Summary, Problem Analysis,
  Multi-Domain Solution Plan, Implementation Roadmap,
  Risk Assessment, Appendix (sp.constitution + sp.specify)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATED requirements.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

fastapi
uvicorn
google-genai
websockets
python-dotenv
python-multipart
langgraph
psycopg2-binary
pydantic
weasyprint
jinja2
httpx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATED .env
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GEMINI_API_KEY=your_key_here
MODEL=gemini-2.0-flash-live-001
DATABASE_URL=your_neon_db_url
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
PDF_STORAGE_BUCKET=your_bucket_name

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCAFFOLD ORDER (step by step)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 → Next.js init
  npx create-next-app@latest frontend 
    --typescript --tailwind --app

STEP 2 → Copy existing files
  cp pcm-processor.js frontend/public/
  (gemini_live.py and main.py already in backend/)

STEP 3 → Port JS → TypeScript
  Create: lib/gemini-client.ts
  Create: lib/media-handler.ts
  Create: components/LiveSession.tsx

STEP 4 → Backend packages
  pip install langgraph psycopg2-binary 
    weasyprint jinja2 pydantic httpx

STEP 5 → Neon DB
  Create project at neon.tech
  Run SQL migrations for 3 tables above
  Add DATABASE_URL to .env

STEP 6 → New backend files
  Create: backend/agents/langgraph_flow.py
  Create: backend/services/pdf_generator.py
  Add new endpoints to: backend/main.py
