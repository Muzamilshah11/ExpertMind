# Implementation Plan: ExpertMind Core Platform

**Branch**: `feature/expertmind-core-platform` | **Date**: 2026-05-26 | **Spec**: `specs/feature/expertmind-core-platform/spec.md`
**Input**: Feature specification from `specs/feature/expertmind-core-platform/spec.md`

## Summary

This plan outlines the implementation of the ExpertMind Core Platform, a multimodal AI consultant that engages clients via live audio and video, intelligently summarizes sessions, delegates to specialist agents through LangGraph, and generates comprehensive PDF reports. The primary technical approach involves porting existing JavaScript frontend components to Next.js/TypeScript, adding new FastAPI endpoints for summarization, orchestration, and PDF generation, and setting up a Neon DB backend with LangGraph for agent coordination.

## Technical Context

**Language/Version**: Python 3.11+, TypeScript 5  
**Primary Dependencies**: FastAPI, LangGraph 0.2+, Google GenAI SDK, Next.js 14 (App Router), React 18, SQLModel, Alembic, WeasyPrint  
**Storage**: Neon DB (Serverless PostgreSQL)  
**Testing**: Unit, Integration, and End-to-End testing for frontend and backend components. Specific frameworks: Vitest + Playwright (Frontend), Pytest + httpx (Backend).  
**Target Platform**: Vercel (frontend), Railway (backend)  
**Project Type**: Web application (Frontend + Backend)  
**Performance Goals**:
-   Audio Response Latency: Sub-200ms (SC-001)
-   Video Update Rate: Sub-1s (SC-001)
-   Summarization Time: Within 5 seconds (SC-002)
-   Orchestration Time: Within 30 seconds for 95% of sessions (SC-003)
-   PDF Generation Time: Within 10 seconds (SC-004)
**Constraints**:
-   LangGraph Iteration Limit: Maximum 5 iterations for agent orchestration (SC-003)
-   System Uptime: 99.9% (SC-006)
-   Existing `gemini_live.py` and `pcm-processor.js` are not to be modified.
**Scale/Scope**: Multimodal AI consultant platform supporting real-time interaction, session analysis, expert agent delegation, and professional report generation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The proposed plan aligns strongly with the ExpertMind Constitution v1.1.0:
-   **I. MULTIMODAL EMPATHIC INTAKE**: Directly supports engaging clients via live audio/video streams, and managing interruptions.
-   **II. INTELLIGENT SUMMARIZATION**: Explicitly implements session summarization with structured JSON and persistence to Neon DB.
-   **III. DYNAMIC AGENT DELEGATION (LangGraph)**: Utilizes LangGraph for orchestrating specialist agents based on detected domains.
-   **IV. RECURSIVE PRACTICAL RESOLUTION**: The LangGraph flow's iteration limit and validation process enforce recursive problem-solving.
-   **V. ARTIFACT GENERATION**: Direct implementation of PDF report generation using WeasyPrint with specified sections.
-   **VI. SPEC-DRIVEN DEV OUTPUT**: `spec_generator` node integrated into LangGraph to produce `sp.constitution` and `sp.specify` from final state.
-   **BEHAVIORAL CONSTRAINTS**: Tone and interaction patterns are handled at the `gemini_live.py` level and through `systemPrompt`/`voice` settings, consistent with constitutional mandates.

No violations detected; plan proceeds.

## Project Structure

### Documentation (this feature)

```text
specs/feature/expertmind-core-platform/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── agents/          # LangGraph flow definitions (langgraph_flow.py)
│   ├── services/        # PDF generation service (pdf_generator.py)
│   ├── models/          # SQLModel definitions (models.py)
│   └── api/             # New REST endpoints in main.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── gemini_live.py       # Existing: DO NOT MODIFY
└── main.py              # Existing: Add new endpoints
frontend/
├── src/
│   ├── app/             # Next.js App Router (page.tsx, session/page.tsx)
│   ├── components/      # React components (LiveSession.tsx)
│   └── lib/             # TypeScript client libraries (gemini-client.ts, media-handler.ts)
├── public/
│   └── pcm-processor.js # Existing: DO NOT MODIFY
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Structure Decision**: The "Web application" option is chosen to reflect the clear separation of frontend (Next.js) and backend (FastAPI) components, with dedicated directories for source code and tests. New backend files are organized into `agents`, `services`, and `models` within `backend/src/`.

## Complexity Tracking

No constitution violations requiring justification at this stage.

## Phase 0: Outline & Research

### Research Tasks (COMPLETE)

1.  **Research Testing Strategy for Next.js/React**: Vitest + Playwright + MSW.
2.  **Research Python Testing Strategy**: Pytest + httpx + LangGraph node testing.
3.  **Research Prisma ORM Integration with FastAPI**: Found deprecated; pivot to **SQLModel**.
4.  **Research Cloud Storage for PDF**: **Cloudflare R2** chosen for zero egress fees.

## Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete (resolving the above research tasks)

1.  **Extract entities from feature spec** → `data-model.md`:
    -   Generate detailed SQLModel schema for `User`, `SessionSummary`, and `AgentRun` tables based on the provided specifications.
    -   Define Pydantic schemas for request/response bodies, ensuring alignment with the SQLModel models.

2.  **Generate API contracts** from functional requirements:
    -   Define OpenAPI specifications for `POST /api/summarize`, `POST /api/orchestrate`, and `POST /api/generate-pdf` endpoints.
    -   Specify request payloads, response structures, and HTTP status codes for each endpoint.

3.  **Agent context update**:
    -   Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType gemini` to update the agent's context with new technologies and architectural decisions (e.g., SQLModel, Alembic, Cloudflare R2, Vitest).

**Output**: `data-model.md`, `contracts/openapi.yaml`, `quickstart.md` (updated with scaffolding steps), agent-specific file.

