<!--
  Sync Impact Report
  ==================
  Version change: (none) → 1.0.0
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles: 6 principles (AI-First, Async/await, Multi-Agent, Real-Time Streaming, Observability, Env-Driven Config)
    - Technology Stack & Constraints
    - Development Workflow & Quality Gates
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - plan-template.md: ✅ no change needed (Constitution Check is a generic gate)
    - spec-template.md: ✅ no change needed
    - tasks-template.md: ✅ no change needed
    - agent-file-template.md: ✅ no change needed (uses [PROJECT NAME] placeholder, not constitution-derived)
    - checklist-template.md: ✅ no change needed
    - adr-template.md: ✅ no change needed
    - phr-template.prompt.md: ✅ no change needed
  Follow-up TODOs: None
-->

# ExpertMind Constitution

## Core Principles

### I. AI-First Architecture

Every feature MUST treat LLMs/AI agents as the primary compute layer. All business
logic SHOULD be expressible as agent nodes or tool calls. Agents are first-class
citizens — they MUST have typed state, dedicated graph nodes, and persisted
outputs in the `AgentRun` table. No feature SHOULD perform semantic reasoning
outside an agent node without explicit justification in an ADR.

### II. Async/await Throughout

All I/O-bound operations MUST use `async/await`. Synchronous blocking calls in
request handlers are prohibited. Database queries, LLM calls, PDF generation,
and WebSocket I/O MUST be non-blocking. Thread pool executors (`run_in_executor`)
MAY be used only for CPU-bound fallbacks (e.g., WeasyPrint rendering) and MUST
be explicitly marked with a comment explaining why a thread escape is necessary.

### III. Multi-Agent Orchestration via LangGraph

Complex tasks MUST be decomposed into specialized agents coordinated via a
LangGraph `StateGraph`. Every agent node MUST accept typed `AgentState`, produce
typed output, and participate in a validation loop with a conditional edge back
to the router or forward to `END`. Agent outputs MUST be persisted to the
`AgentRun` table for auditability. The graph MUST have exactly one entry point
and MUST terminate via `END`.

### IV. Real-Time Streaming First

User-facing interactions SHOULD use real-time streaming (WebSocket, Gemini Live)
rather than request-response where latency matters. The `/ws` endpoint is the
primary interaction channel. Gemini Live audio/video/text streaming MUST be the
default modality for voice/visual sessions. REST endpoints (`/api/summarize`,
`/api/orchestrate`, `/api/generate-pdf`) are reserved for non-interactive or
background operations only.

### V. Observability by Default

Every component MUST log entry, exit, and error conditions via Python's
`logging` module. All agent outputs MUST be persisted in the `AgentRun` table.
All API requests MUST be logged via structured FastAPI middleware. Error events
MUST propagate to the client as structured JSON (`{"type": "error", ...}`).
A `/health` endpoint MUST exist for external monitoring.

### VI. Environment-Driven Configuration

All secrets, endpoints, and tunable parameters MUST come from environment
variables via `.env` files loaded with `python-dotenv`. Fallback to
`os.environ.get()` MUST be explicit with a safe default or empty string + log
warning. NO hardcoded configuration values in source code — this includes model
names, API keys, database URLs, port numbers, and bucket names.

## Technology Stack & Constraints

The project MUST use:
- **Language**: Python 3.11+
- **Web Framework**: FastAPI (HTTP/REST + WebSocket)
- **Agent Orchestration**: LangGraph (`StateGraph` with typed `AgentState`)
- **AI SDK**: Google Generative AI SDK (`genai` library) — `gemini-2.5-flash`
  for text, `gemini-3.1-flash-live-preview` for real-time sessions
- **Database**: PostgreSQL via SQLModel (sync) — migration via Alembic
- **PDF Generation**: WeasyPrint (with graceful fallback)
- **Real-Time Transport**: WebSocket served by FastAPI `/ws` endpoint

No additional frameworks may be introduced without an ADR. All dependencies
MUST be pinned in `requirements.txt` or `pyproject.toml`.

## Development Workflow & Quality Gates

All code MUST pass:
1. **Unit & integration tests** — run via `pytest` from `backend/tests/`
2. **Type consistency** — verified with `pyright` or `mypy`
3. **Linting** — Ruff linting (`ruff check .`)
4. **Constitution compliance** — manual review for each PR verifying no
   principle violations

All secrets MUST live in `.env` (never committed). Feature development MUST
follow the `/sp.plan` → `/sp.spec` → `/sp.tasks` → implement → verify flow
from the `.specify/` toolchain unless explicitly bypassed.

## Governance

The constitution supersedes all ad-hoc development practices. Amendments MUST:
1. Update this file with the proposed change
2. Increment `CONSTITUTION_VERSION` per semantic versioning (see below)
3. Propagate changes to all templates in `.specify/templates/` that reference
   affected principles
4. Pass review by at least one contributor before taking effect

**Versioning policy**:
- **MAJOR**: Backward-incompatible governance changes, principle removals, or
  redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording fixes, typos, non-semantic refinements

**Compliance review**: Every PR MUST include a constitution compliance
self-check. If the PR touches behavior or architecture, the reviewer MUST
explicitly confirm no principles are violated.

**Version**: 1.0.0 | **Ratified**: 2026-05-28 | **Last Amended**: 2026-05-28
