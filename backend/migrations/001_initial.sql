CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  full_name  TEXT,
  plan       TEXT DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_summaries (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  core_problem            TEXT NOT NULL,
  business_context        TEXT,
  technical_constraints   JSONB,
  regulatory_requirements JSONB,
  success_criteria        JSONB,
  detected_domains        JSONB,
  extracted_artifacts     JSONB,
  confidence_score        NUMERIC(3,2),
  langgraph_state         JSONB,
  pdf_url                 TEXT,
  status                  TEXT DEFAULT 'pending',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES session_summaries(id) ON DELETE CASCADE,
  agent_name     TEXT NOT NULL,
  input_context  JSONB,
  output_result  JSONB,
  iteration      INT DEFAULT 1,
  status         TEXT DEFAULT 'running',
  created_at     TIMESTAMPTZ DEFAULT now()
);
