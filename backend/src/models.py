from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

from pydantic import BaseModel
from sqlmodel import Field, SQLModel, Relationship, Column, JSON, String
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
import json


class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    email: str = Field(unique=True, index=True, nullable=False)
    full_name: Optional[str] = None
    plan: str = Field(default="trial")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    sessions: List["SessionSummary"] = Relationship(back_populates="user")

class SessionSummary(SQLModel, table=True):
    __tablename__ = "session_summary" # Explicit table name for Alembic

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)

    core_problem: str = Field(sa_column=Column(String, nullable=False))
    business_context: Optional[str] = None

    technical_constraints: Optional[List[str]] = Field(default=[], sa_column=Column(JSON))
    regulatory_requirements: Optional[List[str]] = Field(default=[], sa_column=Column(JSON))
    success_criteria: Optional[List[str]] = Field(default=[], sa_column=Column(JSON))

    detected_domains: List[str] = Field(default=[], sa_column=Column(JSON))

    extracted_artifacts: Optional[Dict] = Field(default={}, sa_column=Column(JSON))
    confidence_score: float = Field(default=0.0)

    langgraph_state: Optional[Dict] = Field(default={}, sa_column=Column(JSON))

    pdf_url: Optional[str] = None
    status: str = Field(default="pending")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    user: User = Relationship(back_populates="sessions")
    agent_runs: List["AgentRun"] = Relationship(back_populates="session")

class AgentRun(SQLModel, table=True):
    __tablename__ = "agent_run" # Explicit table name for Alembic

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    session_id: UUID = Field(foreign_key="session_summary.id", index=True)

    agent_name: str = Field(nullable=False)
    input_context: Dict = Field(default={}, sa_column=Column(JSON))
    output_result: Dict = Field(default={}, sa_column=Column(JSON))

    iteration: int = Field(default=1)
    status: str = Field(default="running")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    session: SessionSummary = Relationship(back_populates="agent_runs")

# Pydantic model for Gemini structured output parsing
class SummaryParseResult(BaseModel):
    core_problem: str
    business_context: str = ""
    technical_constraints: List[str] = []
    regulatory_requirements: List[str] = []
    success_criteria: List[str] = []
    detected_domains: List[str] = []
    extracted_artifacts: List[Any] = []
    confidence_score: float = 0.0

# Define Pydantic models for API request/response
class SummarizeRequest(SQLModel):
    session_transcript: str
    session_duration: int
    user_id: UUID

class SummarizeResponse(SQLModel):
    session_id: UUID
    status: str

class OrchestrateRequest(SQLModel):
    session_id: str

class OrchestrateResponse(SQLModel):
    session_id: str
    pdf_url: str
    final_spec: Dict
    executive_summary: str
    implementation_roadmap: List[str]
    agent_outputs: Dict[str, Any]

    class Config:
        arbitrary_types_allowed = True

class GeneratePDFRequest(SQLModel):
    state: Dict

class GeneratePDFResponse(SQLModel):
    pdf_url: str
    status: str
