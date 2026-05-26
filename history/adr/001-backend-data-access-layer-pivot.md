# ADR-001: Backend Data Access Layer Pivot

- **Status:** Accepted
- **Date:** 2026-05-26
- **Feature:** expertmind-core-platform
- **Context:** The initial implementation plan specified `prisma-client-py` for the backend ORM. However, research during Phase 0 (Task T013) revealed that `prisma-client-py` was officially deprecated and archived in March 2025. This poses a significant risk to long-term maintainability and security.

## Decision

We will pivot from Prisma to **SQLModel** (built on SQLAlchemy 2.0 and Pydantic) for the backend data access layer.

- **ORM:** SQLModel
- **Database Engine:** SQLAlchemy 2.0
- **Validation:** Pydantic v2
- **Migrations:** Alembic
- **Database:** Neon DB (PostgreSQL)

## Consequences

### Positive

- **Sustainability:** SQLModel is actively maintained and built on industry-standard libraries (SQLAlchemy/Pydantic).
- **FastAPI Integration:** Deeply integrated with FastAPI, allowing the same models to be used for both database schemas and API request/response validation.
- **Type Safety:** Excellent native Python type hinting support.
- **Performance:** Leverages the performance and maturity of SQLAlchemy 2.0.

### Negative

- **Schema Drift:** Requires manual coordination between Python classes and the database schema (via Alembic) compared to Prisma's DSL approach.
- **Learning Curve:** Slightly higher complexity than Prisma for advanced database operations due to SQLAlchemy's depth.

## Alternatives Considered

- **Prisma Client Python:** Rejected due to deprecation and archiving.
- **Tortoise ORM:** Rejected in favor of SQLModel's closer alignment with FastAPI's ecosystem.
- **Raw SQLAlchemy:** Rejected as SQLModel provides a more ergonomic experience for FastAPI users by merging Pydantic and SQLAlchemy models.

## References

- Feature Spec: `specs/feature/expertmind-core-platform/spec.md`
- Implementation Plan: `specs/feature/expertmind-core-platform/plan.md`
- Research: `specs/feature/expertmind-core-platform/research.md`
