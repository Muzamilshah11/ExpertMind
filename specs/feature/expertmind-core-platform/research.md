# Research: ExpertMind Core Platform Infrastructure & Testing

This document summarizes the research findings for Phase 0/2 of the ExpertMind Core Platform implementation.

## T011: Next.js/React Testing Strategy

**Recommended Stack:** Vitest + React Testing Library (RTL) + Playwright + Mock Service Worker (MSW)

### 1. Layered Approach
- **Unit / Component Testing (Vitest + RTL):**
    - Use for Client Components, Hooks, and Utility functions.
    - Fast execution, Vite-native.
    - Mock Next.js navigation and other modules using `vi.mock`.
- **E2E Testing (Playwright):**
    - Use for Async Server Components, Server Actions, and full user flows (Auth, Session connection).
    - Runs in a real browser, handles the full server-client lifecycle.
- **API Mocking (MSW):**
    - Intercept network requests in both Vitest and Playwright to ensure deterministic tests without hitting real backend endpoints.

### 2. Configuration Highlights
- `vitest.config.ts`: Set environment to `jsdom`.
- `playwright.config.ts`: Configure `webServer` to start the Next.js dev server.

---

## T012: Python Testing Strategy (FastAPI & LangGraph)

**Recommended Stack:** Pytest + httpx + Schemathesis

### 1. FastAPI Testing
- Use `pytest` with `httpx.AsyncClient` for asynchronous endpoint testing.
- Utilize FastAPI's `app.dependency_overrides` to inject mock databases or services during testing.

### 2. LangGraph Testing
- **Unit Testing Nodes:** Since nodes are just Python functions, test them individually by passing in state and verifying the output state.
- **Integration Testing the Graph:**
    - Use `FakeChatModel` or mock the LLM's `invoke` method to test graph traversal without API costs/latency.
    - Verify state transitions and edge logic (e.g., conditional routing).
- **State Validation:** Use Pydantic models (integrated with LangGraph State) to validate state at each step.

### 3. Contract Testing
- Use **Schemathesis** to automatically generate test cases based on the OpenAPI schema and verify that the backend adheres to the defined contract.

---

## T013: Prisma ORM vs. SQLModel (CRITICAL)

**Finding:** `prisma-client-py` is **deprecated** as of March 2025 and the repository is archived.

**Recommendation: Pivot to SQLModel**

### Comparison
| Feature | Prisma Client Python | SQLModel |
| :--- | :--- | :--- |
| **Status** | **Deprecated (March 2025)** | Active / Maintained |
| **Author** | Community (Robert Craigie) | Tiangolo (FastAPI creator) |
| **Base** | Rust/TypeScript binary | SQLAlchemy + Pydantic |
| **DX** | Schema-first (.prisma) | Class-first (Python) |
| **Type Safety** | High (generated) | High (native Python) |

### Rationale for Pivot
- **Sustainability:** Prisma Python will not receive security updates or new features.
- **FastAPI Integration:** SQLModel is designed specifically for FastAPI, sharing Pydantic models for both DB and API layers.
- **Standardization:** SQLAlchemy is the Python industry standard; SQLModel makes it ergonomic.

---

## T014: Cloud Storage for PDF Reports

**Recommendation: Cloudflare R2**

### Comparison for Railway Deployment
| Feature | AWS S3 | Cloudflare R2 | Uploadthing |
| :--- | :--- | :--- | :--- |
| **Egress Fees** | High ($0.09/GB) | **$0 (Zero)** | Included |
| **API** | S3 Standard | S3 Compatible | Custom |
| **Free Tier** | 5GB (12 months) | **10GB (Permanent)** | 2GB (Permanent) |
| **Complexity** | High (IAM) | Low | Very Low |

### Rationale
- **Zero Egress Fees:** Essential for a platform generating many reports for different users.
- **S3 Compatibility:** Allows using standard AWS SDKs or libraries.
- **Cost-Effective:** Superior free tier and predictable pricing for early growth.
