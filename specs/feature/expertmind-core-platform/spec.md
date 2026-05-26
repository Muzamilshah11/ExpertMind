# Feature Specification: ExpertMind Core Platform

**Feature Branch**: `feature/expertmind-core-platform`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "/SP.SPECIFY"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Multimodal Interaction (Priority: P1)

User connects to the platform, sends audio/video/text, and receives real-time audio responses. This is the primary interaction loop for the ExpertMind consultant.

**Why this priority**: This is the core functionality and user value proposition of the ExpertMind platform. Without it, no other features are meaningful.

**Independent Test**: Can be fully tested by establishing a WebSocket connection, sending audio/video/text, and receiving a synthesized audio response. Delivers core conversational AI capabilities.

**Acceptance Scenarios**:

1.  **Given** the user is on the landing page, **When** they click "Connect" and allow camera/microphone access, **Then** a live WebSocket session is established, and the `LiveSession` component renders the video preview and active controls.
2.  **Given** a live session is active, **When** the user speaks into the microphone, **Then** PCM audio data is processed, downsampled to 16kHz, converted to Int16, and streamed to the backend.
3.  **Given** a live session is active and the camera is enabled, **When** the user moves or changes their visual context, **Then** JPEG video frames (1 FPS, 640x480, quality 0.7) are captured and streamed to the backend.
4.  **Given** a live session is active and the Gemini AI is speaking, **When** the user starts speaking, **Then** `server_content.interrupted` event is triggered, and the AI's current response is immediately interrupted.
5.  **Given** a live session is active, **When** the backend sends audio response data, **Then** `audio_output_callback` plays the audio seamlessly to the user.

### User Story 2 - Session Summarization & Review (Priority: P1)

User ends a session and can view a structured summary of the conversation, allowing for efficient review and record-keeping.

**Why this priority**: Essential for capturing the value of each consultation and enabling downstream processes like agent orchestration and report generation.

**Independent Test**: Can be fully tested by completing a session, triggering summarization, and verifying the presence and structure of the JSON summary in the database. Delivers session persistence and analysis.

**Acceptance Scenarios**:

1.  **Given** a live session has ended (`turn_complete` event), **When** the user clicks "Summarize" on the frontend, **Then** the full `input_transcription` and `output_transcription` logs are sent as `session_transcript` to the `POST /api/summarize` endpoint.
2.  **Given** the `POST /api/summarize` endpoint receives a valid `session_transcript`, **When** the Gemini prompt is built and `genai.Client` is called, **Then** a structured JSON summary (conforming to the Pydantic model) is extracted via validation.
3.  **Given** a valid structured JSON summary is produced, **When** the summary is written to the `session_summaries` table in Neon DB, **Then** the endpoint returns `{ session_id, status: "summarized" }`.

### User Story 3 - Intelligent Agent Orchestration (Priority: P2)

The system intelligently delegates tasks to specialist agents based on the session summary, enabling complex problem-solving.

**Why this priority**: Orchestration is key to providing expert-level, multi-domain consulting beyond simple Q&A.

**Independent Test**: Can be fully tested by triggering the `/api/orchestrate` endpoint with a `session_id` and verifying that the LangGraph flow initiates, relevant agents are invoked, and a merged solution is produced (without necessarily generating a PDF). Delivers advanced problem-solving capabilities.

**Acceptance Scenarios**:

1.  **Given** a session has been summarized and its `session_id` is available, **When** `POST /api/orchestrate` is called with the `session_id`, **Then** the `context_loader` node fetches the summary from Neon DB.
2.  **Given** the `master_router` node receives the session summary, **When** `detected_domains` are identified, **Then** the router decides which specialist agents (`business_analyst`, `tech_architect`, `legal_compliance`) are activated.
3.  **Given** specialist agents are invoked and execute their tasks, **When** their individual outputs are generated, **Then** the `solution_merger` node successfully combines these into a cohesive solution.
4.  **Given** the `validator` node evaluates the `merged_solution`, **When** `is_validated` is `True` or `iteration_count` reaches 5, **Then** the LangGraph flow progresses to `spec_generator` or terminates.

### User Story 4 - PDF Report Generation (Priority: P2)

User can generate a professional PDF report of the session outcomes, providing a tangible deliverable for the client.

**Why this priority**: Provides a polished, client-facing artifact that formalizes the consultation output.

**Independent Test**: Can be fully tested by providing a final LangGraph state to `/api/generate-pdf` and verifying that a PDF is created, uploaded to cloud storage, and its URL is updated in the database. Delivers professional reporting.

**Acceptance Scenarios**:

1.  **Given** the LangGraph flow has reached a final state (`final_spec` is available), **When** `POST /api/generate-pdf` is called with the final state, **Then** the `pdf_generator.py` service injects the state into a Jinja2 HTML template.
2.  **Given** the HTML template is rendered with the session state, **When** WeasyPrint processes the HTML, **Then** PDF bytes are generated.
3.  **Given** PDF bytes are generated, **When** the PDF is uploaded to cloud storage, **Then** a `pdf_url` is obtained.
4.  **Given** a `pdf_url` is obtained, **When** the `session_summaries.pdf_url` in Neon DB is updated, **Then** the endpoint returns `{ pdf_url: "..." }`.
5.  **Given** the PDF is generated, **Then** it includes sections for Cover Page, Executive Summary, Problem Analysis, Multi-Domain Solution Plan, Implementation Roadmap, Risk Assessment, and Appendix (`sp.constitution` + `sp.specify`).

### User Story 5 - Dynamic Settings Configuration (Priority: P3)

User can customize session settings like voice and system prompt, tailoring the ExpertMind's behavior to their specific needs.

**Why this priority**: Enhances user experience and flexibility, but not critical for initial core functionality.

**Independent Test**: Can be tested by interacting with the settings modal and verifying that the chosen settings are sent with the `sendSettings` payload to the backend and influence the AI's behavior (e.g., changing voice). Delivers personalization.

**Acceptance Scenarios**:

1.  **Given** the user is on the `LiveSession` screen, **When** they click a "Settings" button, **Then** a modal appears with a `systemPrompt` textarea and a `voice` select dropdown (options: Puck, Charon, Kore, Fenrir, Aoede).
2.  **Given** the user modifies the `systemPrompt` or `voice` selection in the modal, **When** they save the settings, **Then** these settings are persisted (e.g., in local storage or user profile).
3.  **Given** a new session is initiated after settings are saved, **When** `geminiClient.connect()` is called, **Then** the `sendSettings({ voice, systemPrompt })` payload is included in the initial WebSocket connection message.

### Edge Cases

-   What happens when `getUserMedia` permissions are denied by the user for audio or video?
-   How does the system handle network disconnections or significant latency during a live session, especially for audio/video streaming?
-   What if the WebSocket connection fails to establish or unexpectedly closes mid-session?
-   How does the system gracefully handle invalid or malformed data received from the `pcm-processor.js` or `MediaHandler`?
-   What if the Pydantic validation for the `/api/summarize` endpoint's output JSON fails, resulting in an unparsable summary?
-   How does the LangGraph engine manage errors or infinite loops if a specialist agent node fails or produces unexpected output?
-   What happens if the `iteration_count` reaches 5 in LangGraph without `is_validated` becoming `True`?
-   How does the `pdf_generator` handle an empty or malformed `final LangGraph state dict` when generating the PDF?
-   What if the cloud storage upload for the PDF fails?

## Requirements *(mandatory)*

### Functional Requirements

-   **FR-001**: The frontend MUST be a Next.js 14 application using the App Router and React 18 with TypeScript 5 and Tailwind CSS 3.
-   **FR-002**: The `gemini-client.ts` MUST port existing `gemini-client.js` functionality with TypeScript interfaces for all message types (`settings`, `image`, `audio`, `text`).
-   **FR-003**: The `media-handler.ts` MUST port existing `media-handler.js` functionality as a TypeScript class, handling `getUserMedia`, `AudioWorklet` (loading `pcm-processor.js`), downsampling audio to 16kHz (Float32 to Int16), capturing video frames (1 FPS, 640x480 JPEG 0.7), and audio playback.
-   **FR-004**: The `LiveSession.tsx` component MUST manage real-time session state (`isConnected`, `isRecording`, `isCameraOn`, `messages[]`, `sessionEnded`), render video preview, controls (mic/camera/screen), chat log, text input, and a settings modal for `systemPrompt` and `voice` selection.
-   **FR-005**: The backend MUST use Python 3.11+ and FastAPI.
-   **FR-006**: The `backend/main.py` file MUST expose a WebSocket endpoint `/ws` for live interaction, and new REST endpoints: `POST /api/summarize`, `POST /api/orchestrate`, and `POST /api/generate-pdf`.
-   **FR-007**: The `POST /api/summarize` endpoint MUST:
    -   Accept `session_transcript` (str), `session_duration` (int), `user_id` (str).
    -   Use `genai.Client` to build a Gemini prompt and extract a structured JSON summary.
    -   Validate the summary against a Pydantic model and write it to the `session_summaries` table in Neon DB.
    -   Return `{ session_id, status: "summarized" }`.
-   **FR-008**: The `POST /api/orchestrate` endpoint MUST:
    -   Accept `{ session_id: str }`.
    -   Initiate a LangGraph flow (defined in `backend/agents/langgraph_flow.py`).
    -   The LangGraph flow MUST include `context_loader`, `master_router`, `business_analyst`, `tech_architect`, `legal_compliance`, `solution_merger`, `validator`, `spec_generator`, and `pdf_trigger` nodes.
    -   The LangGraph state MUST be a TypedDict with `session_id`, `summary`, `active_agents`, `agent_outputs`, `merged_solution`, `iteration_count`, `is_validated`, `final_spec`, and `pdf_url`.
    -   The LangGraph flow MUST terminate when `is_validated == True` or `iteration_count >= 5`.
-   **FR-009**: The `POST /api/generate-pdf` endpoint MUST:
    -   Accept the final LangGraph state dictionary.
    -   Use `backend/services/pdf_generator.py` to inject state into a Jinja2 HTML template.
    -   Utilize WeasyPrint to convert HTML to PDF bytes.
    -   Upload the PDF to cloud storage and update `session_summaries.pdf_url` in Neon DB.
    -   Return `{ pdf_url: str }`.
-   **FR-010**: The project MUST use Neon DB (Serverless PostgreSQL) as its database.
-   **FR-011**: The project MUST use Prisma ORM for interacting with the database.
-   **FR-012**: The database schema MUST include `users`, `session_summaries`, and `agent_runs` tables with specified columns and relationships (UUID PKs, FKs, JSONB, TEXT[]).
-   **FR-013**: The `requirements.txt` file MUST include `fastapi`, `uvicorn`, `google-genai`, `websockets`, `python-dotenv`, `python-multipart`, `langgraph`, `psycopg2-binary`, `pydantic`, `weasyprint`, `jinja2`, `httpx`.
-   **FR-014**: The `.env` file MUST define `GEMINI_API_KEY`, `MODEL`, `DATABASE_URL`, `NEXT_PUBLIC_BACKEND_URL`, and `PDF_STORAGE_BUCKET`.

### Key Entities *(include if feature involves data)*

-   **User**: Represents a platform user.
    -   `id` (UUID PK): Unique identifier.
    -   `email` (TEXT UNIQUE NOT NULL): User's email address.
    -   `full_name` (TEXT): User's full name.
    -   `plan` (TEXT DEFAULT 'trial'): Subscription plan.
    -   `created_at` (TIMESTAMPTZ DEFAULT now()): Timestamp of creation.
-   **SessionSummary**: Stores high-level outcomes and metadata for each user session.
    -   `id` (UUID PK): Unique identifier for the summary.
    -   `user_id` (UUID FK): Foreign key to the `users` table.
    -   `core_problem` (TEXT NOT NULL): The primary problem identified during the session.
    -   `business_context` (TEXT): Business context provided or inferred.
    -   `technical_constraints` (JSONB): List of technical constraints.
    -   `regulatory_requirements` (JSONB): List of regulatory requirements.
    -   `success_criteria` (JSONB): List of success criteria.
    -   `detected_domains` (TEXT[]): Array of specialist domains identified.
    -   `extracted_artifacts` (JSONB): Any artifacts extracted during the session.
    -   `confidence_score` (NUMERIC(3,2)): AI's confidence in the summary (0.0-1.0).
    -   `langgraph_state` (JSONB): Full LangGraph state after orchestration.
    -   `pdf_url` (TEXT): URL to the generated PDF report.
    -   `status` (TEXT DEFAULT 'pending'): Current status of the summary (e.g., 'pending', 'summarized', 'orchestrated', 'pdf_generated').
    -   `created_at` (TIMESTAMPTZ DEFAULT now()): Timestamp of creation.
    -   `updated_at` (TIMESTAMPTZ DEFAULT now()): Timestamp of last update.
-   **AgentRun**: Records details of each specialist agent's execution within a session.
    -   `id` (UUID PK): Unique identifier for the agent run.
    -   `session_id` (UUID FK): Foreign key to the `session_summaries` table.
    -   `agent_name` (TEXT NOT NULL): Name of the agent that ran (e.g., 'business_analyst').
    -   `input_context` (JSONB): Input provided to the agent for this run.
    -   `output_result` (JSONB): Output produced by the agent.
    -   `iteration` (INT DEFAULT 1): Iteration number within the LangGraph flow.
    -   `status` (TEXT DEFAULT 'running'): Status of the agent run (e.g., 'running', 'completed', 'failed').
    -   `created_at` (TIMESTAMPTZ DEFAULT now()): Timestamp of creation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

-   **SC-001**: A user can successfully connect to a live session via `app/session/page.tsx` and engage in real-time multimodal communication (audio, video, text input, audio output) without perceptible latency (sub-200ms audio response time, sub-1s video update).
-   **SC-002**: Upon session completion, a structured JSON summary (conforming to the Pydantic model) is accurately generated from the full transcript and stored in the `session_summaries` table within 5 seconds of the `POST /api/summarize` request.
-   **SC-003**: The LangGraph engine, triggered via `POST /api/orchestrate`, successfully orchestrates the necessary specialist agents (`business_analyst`, `tech_architect`, `legal_compliance`) based on `detected_domains`, and produces a `merged_solution` within 30 seconds for 95% of sessions, completing within a maximum of 5 iterations.
-   **SC-004**: A comprehensive PDF report, including all specified sections and formatted with `sp.constitution` and `sp.specify` commands in the appendix, is generated via `POST /api/generate-pdf` and uploaded to cloud storage, with its URL updated in the `session_summaries` table, all within 10 seconds.
-   **SC-005**: All frontend components (`gemini-client.ts`, `media-handler.ts`, `LiveSession.tsx`) are fully type-safe with TypeScript, passing linting and compilation checks (`tsc --noEmit`, `eslint`).
-   **SC-006**: The deployed system on Vercel (frontend) and Railway (backend) maintains 99.9% uptime.
-   **SC-007**: Users can successfully configure `systemPrompt` and `voice` options through the settings modal, and these preferences are correctly applied in subsequent live sessions.
