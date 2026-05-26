# Data Model: ExpertMind Core Platform

This document defines the SQLModel entities and Pydantic schemas for the ExpertMind Core Platform.

## Database Entities (SQLModel)

### 1. User
Represents a platform user.

```python
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    full_name: Optional[str] = None
    plan: str = Field(default="trial")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    sessions: List["SessionSummary"] = Relationship(back_populates="user")
```

### 2. SessionSummary
Stores high-level outcomes and metadata for each user session.

```python
from sqlalchemy import Column, JSON, String
from sqlalchemy.dialects.postgresql import ARRAY

class SessionSummary(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    
    core_problem: str = Field(sa_column=Column(String, nullable=False))
    business_context: Optional[str] = None
    
    # Using JSON for flexibility across different DB providers if needed, 
    # but optimized for PostgreSQL JSONB via SQLAlchemy.
    technical_constraints: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    regulatory_requirements: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    success_criteria: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    
    # Detected domains as a list of strings
    detected_domains: List[str] = Field(default=[], sa_column=Column(JSON))
    
    extracted_artifacts: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    confidence_score: float = Field(default=0.0)
    
    # Full LangGraph state after orchestration
    langgraph_state: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    pdf_url: Optional[str] = None
    status: str = Field(default="pending") # pending, summarized, orchestrated, pdf_generated
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="sessions")
    agent_runs: List["AgentRun"] = Relationship(back_populates="session")
```

### 3. AgentRun
Records details of each specialist agent's execution within a session.

```python
class AgentRun(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="sessionsummary.id")
    
    agent_name: str = Field(nullable=False)
    input_context: dict = Field(default={}, sa_column=Column(JSON))
    output_result: dict = Field(default={}, sa_column=Column(JSON))
    
    iteration: int = Field(default=1)
    status: str = Field(default="running") # running, completed, failed
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    session: SessionSummary = Relationship(back_populates="agent_runs")
```

## API Schemas (Pydantic)

### Summarization
Used for `POST /api/summarize`.

```python
from pydantic import BaseModel

class SummarizeRequest(BaseModel):
    session_transcript: str
    session_duration: int
    user_id: str

class SummarizeResponse(BaseModel):
    session_id: UUID
    status: str
```

### Orchestration
Used for `POST /api/orchestrate`.

```python
class OrchestrateRequest(BaseModel):
    session_id: UUID

class OrchestrateResponse(BaseModel):
    session_id: UUID
    status: str
```

### PDF Generation
Used for `POST /api/generate-pdf`.

```python
class GeneratePDFRequest(BaseModel):
    # Accepts the final LangGraph state
    state: dict

class GeneratePDFResponse(BaseModel):
    pdf_url: str
```
