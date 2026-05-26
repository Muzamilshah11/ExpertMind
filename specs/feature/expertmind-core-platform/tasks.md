# Tasks: ExpertMind Core Platform

**Input**: Design documents from `specs/feature/expertmind-core-platform/`
**Prerequisites**: `plan.md`, `spec.md`
**Tests**: Test tasks will be integrated into each user story where applicable, focusing on contract and integration tests as specified in the plan. Unit tests and comprehensive e2e tests will be part of the "Polish & Cross-Cutting Concerns" phase after research on testing frameworks is complete.

## Format: `[ID] [P?] [Story?] Description with file path`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure. This phase sets up the core development environment and project scaffolding.

- [x] T001 Create Next.js project: `npx create-next-app@latest frontend --typescript --tailwind --app`
- [x] T002 Copy `pcm-processor.js` to `frontend/public/`: `cp pcm-processor.js frontend/public/`
- [x] T003 Configure Python backend dependencies in `requirements.txt`: Add `fastapi`, `uvicorn`, `google-genai`, `websockets`, `python-dotenv`, `python-multipart`, `langgraph`, `psycopg2-binary`, `pydantic`, `weasyprint`, `jinja2`, `httpx`
- [x] T004 [P] Create `.env` file with placeholders for `GEMINI_API_KEY`, `MODEL`, `DATABASE_URL`, `NEXT_PUBLIC_BACKEND_URL`, `PDF_STORAGE_BUCKET`
- [x] T005 [P] Implement `frontend/src/app/page.tsx` for the landing/connect screen.
- [x] T006 [P] Implement `frontend/src/app/session/page.tsx` to render `LiveSession.tsx`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Includes database and core backend services.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

-   [ ] T007 Set up Neon DB project and run SQL migrations for `users`, `session_summaries`, and `agent_runs` tables.
-   [ ] T008 Configure SQLModel and Alembic for database interactions, including `models.py` and initial migration.
-   [ ] T009 [P] Implement `backend/main.py`: Initialize FastAPI app, configure `websocket.send_bytes()` for `audio_output_callback`.
-   [ ] T010 [P] Integrate basic logging and error handling middleware in `backend/main.py`.
- [x] T011 Research Testing Strategy for Next.js/React (from plan.md - Phase 0).
- [x] T012 Research Python Testing Strategy (from plan.md - Phase 0).
- [x] T013 Research SQLModel Integration with FastAPI (pivoted from Prisma).
- [x] T014 Research Cloud Storage for PDF (from plan.md - Phase 0).

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel. Note: Research tasks T011-T014 can be completed in parallel with other foundational tasks, but their outcomes may influence subsequent design/implementation choices.

---

## Phase 3: User Story 1 - Real-time Multimodal Interaction (Priority: P1) 🎯 MVP

**Goal**: Enable users to connect, send audio/video/text, and receive real-time audio responses.

**Independent Test**: Establish a WebSocket connection, send audio/video/text, and receive a synthesized audio response.

### Implementation for User Story 1

-   [ ] T015 Port `gemini-client.js` to `frontend/src/lib/gemini-client.ts` with TypeScript interfaces for all message types.
-   [ ] T016 Port `media-handler.js` to `frontend/src/lib/media-handler.ts` as a TypeScript class.
-   [ ] T017 Implement `initializeAudio()` in `media-handler.ts` to load `pcm-processor.js`.
-   [ ] T018 Implement `startAudio(onAudioData)` in `media-handler.ts` for `getUserMedia`, `AudioWorklet`, downsampling to 16kHz, and Float32→Int16 conversion.
-   [ ] T019 Implement `startVideo(videoEl, onFrame)` in `media-handler.ts` for `getUserMedia`, 1 FPS capture, and 640x480 JPEG 0.7 framing.
-   [ ] T020 Implement `startScreen(videoEl, onFrame, onEnded)` in `media-handler.ts` using `getDisplayMedia`.
-   [ ] T021 Implement `stopAudio()`, `stopVideo()`, `stopAudioPlayback()` in `media-handler.ts`.
-   [ ] T022 Implement `playAudio(arrayBuffer)` in `media-handler.ts` for Int16→Float32 conversion and 24000Hz AudioContext scheduling.
-   [ ] T023 Implement `frontend/src/components/LiveSession.tsx`:
    -   [ ] T023a [P] Initialize `useRef` for `videoPreview` and `audioContext`.
    -   [ ] T023b [P] Implement `useState` for `isConnected`, `isRecording`, `isCameraOn`, `messages[]`, `sessionEnded`.
    -   [ ] T023c [P] Implement `onConnect` logic: init audio → `geminiClient.connect()` → `sendSettings({ voice, systemPrompt })`.
    -   [ ] T023d [P] Render video preview, mic/camera/screen buttons, chat log, text input + send button, disconnect button.
    -   [ ] T023e [P] Implement settings modal for `systemPrompt` textarea and `voice` select (Puck/Charon/Kore/Fenrir/Aoede).
-   [ ] T024 Integrate `gemini-client.ts` and `media-handler.ts` into `LiveSession.tsx` for real-time data flow.
-   [ ] T025 Ensure `backend/main.py` handles WebSocket messages for settings payload, image (base64 JPEG), audio (raw bytes), and text.
-   [ ] T026 Implement `server_content.interrupted` event handling in `backend/gemini_live.py` (via `main.py` interface).
-   [ ] T027 Implement `audio_output_callback` to stream PCM responses from `backend/gemini_live.py` via `websocket.send_bytes()`.

**Checkpoint**: User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Session Summarization & Review (Priority: P1)

**Goal**: Enable users to review structured summaries of their sessions.

**Independent Test**: Complete a session, trigger summarization, and verify the presence and structure of the JSON summary in the database.

### Implementation for User Story 2

-   [ ] T028 Add `POST /api/summarize` endpoint to `backend/main.py`:
    -   [ ] T028a Define input model for `session_transcript`, `session_duration`, `user_id`.
    -   [ ] T028b Build Gemini prompt using the transcript.
    -   [ ] T028c Call `genai.Client` for summarization.
    -   [ ] T028d Implement Pydantic model validation for output JSON schema.
    -   [ ] T028e Write structured summary to `session_summaries` table using SQLModel.
    -   [ ] T028f Return `{ session_id, status: "summarized" }`.
-   [ ] T029 Implement "Summarize" button functionality in `LiveSession.tsx` to `POST` the transcript to `/api/summarize` on session end.

**Checkpoint**: User Story 2 should be fully functional and testable independently.

---

## Phase 5: User Story 3 - Intelligent Agent Orchestration (Priority: P2)

**Goal**: Enable the system to intelligently delegate tasks to specialist agents.

**Independent Test**: Trigger `/api/orchestrate` with a `session_id` and verify that the LangGraph flow initiates, invokes relevant agents, and produces a merged solution within the LangGraph state.

### Implementation for User Story 3

-   [ ] T030 Create `backend/src/agents/langgraph_flow.py` and define the LangGraph state (TypedDict).
-   [ ] T031 Implement LangGraph nodes in `backend/src/agents/langgraph_flow.py`:
    -   [ ] T031a `context_loader`: Fetch summary from Neon DB.
    -   [ ] T031b `master_router`: Read `detected_domains`, decide agent list.
    -   [ ] T031c `business_analyst`: Placeholder for business model, risks, stakeholders logic.
    -   [ ] T031d `tech_architect`: Placeholder for system design, stack, integrations logic.
    -   [ ] T031e `legal_compliance`: Placeholder for regulatory flags logic.
    -   [ ] T031f `solution_merger`: Merge all agent outputs.
    -   [ ] T031g `validator`: Check `is_validated`, re-route if needed (max 5 iterations).
    -   [ ] T031h `spec_generator`: Produce `sp.constitution` + `sp.specify` from state.
    -   [ ] T031i `pdf_trigger`: POST to `/api/generate-pdf`.
-   [ ] T032 Add `POST /api/orchestrate` endpoint to `backend/main.py`:
    -   [ ] T032a Define input model for `session_id`.
    -   [ ] T032b Initiate the LangGraph flow from `langgraph_flow.py`.

**Checkpoint**: User Story 3 should be fully functional and testable independently.

---

## Phase 6: User Story 4 - PDF Report Generation (Priority: P2)

**Goal**: Generate professional PDF reports of session outcomes.

**Independent Test**: Provide a final LangGraph state to `/api/generate-pdf` and verify PDF creation, cloud upload, and database URL update.

### Implementation for User Story 4

-   [ ] T033 Create `backend/src/services/pdf_generator.py`.
-   [ ] T034 Implement PDF generation logic in `backend/src/services/pdf_generator.py`:
    -   [ ] T034a Inject LangGraph state into Jinja2 HTML template.
    -   [ ] T034b Use WeasyPrint to convert HTML to PDF bytes.
    -   [ ] T034c Upload PDF bytes to Cloudflare R2.
    -   [ ] T034d Update `session_summaries.pdf_url` in Neon DB using SQLModel.
    -   [ ] T034e Return `{ pdf_url: str }`.
-   [ ] T035 Add `POST /api/generate-pdf` endpoint to `backend/main.py`:
    -   [ ] T035a Define input model (final LangGraph state dict).
    -   [ ] T035b Call `pdf_generator.py` service.
-   [ ] T036 Integrate `pdf_trigger` node in `langgraph_flow.py` to call `/api/generate-pdf`.

**Checkpoint**: User Story 4 should be fully functional and testable independently.

---

## Phase 7: User Story 5 - Dynamic Settings Configuration (Priority: P3)

**Goal**: Allow users to customize session settings.

**Independent Test**: Interact with settings modal, verify settings are sent with `sendSettings` payload and influence AI behavior.

### Implementation for User Story 5

-   [ ] T037 Ensure `LiveSession.tsx` settings modal correctly handles `systemPrompt` and `voice` selection.
-   [ ] T038 Implement persistence for user settings (e.g., local storage or user profile via `users` table).
-   [ ] T039 Ensure `geminiClient.connect()` in `LiveSession.tsx` sends `sendSettings({ voice, systemPrompt })` payload.

**Checkpoint**: User Story 5 should be fully functional and testable independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall system quality.

-   [ ] T040 Implement comprehensive unit tests for `frontend/src/lib/gemini-client.ts` and `frontend/src/lib/media-handler.ts`.
-   [ ] T041 Implement comprehensive unit tests for `backend/src/agents/langgraph_flow.py` and `backend/src/services/pdf_generator.py`.
-   [ ] T042 Implement integration tests for `POST /api/summarize`, `POST /api/orchestrate`, `POST /api/generate-pdf` endpoints.
-   [ ] T043 Implement end-to-end tests for core user journeys (SC-001, SC-002, SC-003, SC-004) for `frontend` and `backend`.
-   [ ] T044 Improve logging and monitoring for all services to meet NFRs.
-   [ ] T045 Conduct security review and implement necessary hardening measures.
-   [ ] T046 Optimize performance based on identified bottlenecks and NFRs (SC-001 to SC-004).
-   [ ] T047 Update `quickstart.md` with instructions for running the full system.
-   [ ] T048 Refactor and clean up code across the project for maintainability.

---

## Dependencies & Execution Order

### Phase Dependencies

-   **Setup (Phase 1)**: No dependencies - can start immediately.
-   **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories. Research tasks T011-T014 can run concurrently with other foundational tasks.
-   **User Stories (Phase 3+)**: All depend on Foundational phase completion. User stories can proceed in parallel (if staffed) or sequentially by priority (P1 → P2 → P3).
-   **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

-   **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
-   **User Story 2 (P1)**: Depends on User Story 1 (specifically, `LiveSession.tsx` and transcription data).
-   **User Story 3 (P2)**: Depends on User Story 2 (requires session summaries).
-   **User Story 4 (P2)**: Depends on User Story 3 (requires final LangGraph state).
-   **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Independent of other user stories' core logic, but integrates with `LiveSession.tsx`.

### Within Each User Story

-   Implementation tasks are generally sequential where dependencies exist (e.g., models before services).
-   Parallelizable tasks are marked with `[P]`.

### Parallel Opportunities

-   All tasks marked with `[P]` within a phase can run in parallel.
-   Research tasks (T011-T014) can run concurrently with other foundational tasks.
-   Once the Foundational phase is complete, different user stories can be worked on in parallel by different team members, respecting the story dependencies listed above.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1.  Complete Phase 1: Setup.
2.  Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3.  Complete Phase 3: User Story 1 (Real-time Multimodal Interaction).
4.  Complete Phase 4: User Story 2 (Session Summarization & Review).
5.  **STOP and VALIDATE**: Test User Story 1 and 2 independently and together.
6.  Deploy/demo if ready (Core Multimodal interaction + summarization).

### Incremental Delivery

1.  Complete Setup + Foundational → Foundation ready.
2.  Add User Story 1 → Test independently → Deploy/Demo (Core Multimodal interaction).
3.  Add User Story 2 → Test independently → Deploy/Demo (Summarization added).
4.  Add User Story 3 → Test independently → Deploy/Demo (Orchestration added).
5.  Add User Story 4 → Test independently → Deploy/Demo (PDF Reporting added).
6.  Add User Story 5 → Test independently → Deploy/Demo (Settings added).
7.  Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1.  Team completes Setup + Foundational together.
2.  Once Foundational is done:
    -   Developer A: User Story 1 (Core Multimodal)
    -   Developer B: User Story 5 (Settings - independent frontend task)
    -   Developer C: User Story 2 (Summarization - depends on US1) once US1 is stable.
    -   Developer D: User Story 3 (Orchestration - depends on US2) once US2 is stable.
    -   Developer E: User Story 4 (PDF Reporting - depends on US3) once US3 is stable.
3.  Stories complete and integrate independently based on dependencies.

---

## Notes

-   Tasks clearly define scope and file paths.
-   Dependencies are explicitly stated for stories and within phases.
-   "Test" tasks will be defined more concretely once testing research (T011, T012) is complete.
-   Commit after each task or logical group.
-   Stop at any checkpoint to validate story independently.
-   Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence.
