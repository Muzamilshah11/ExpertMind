import json
import os
import logging
from typing import TypedDict, List, Dict, Optional, Annotated, Any
from langgraph.graph import StateGraph, END
import operator
from src.db import fetch_summary
from google import genai

logger = logging.getLogger(__name__)

_genai_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set")
        _genai_client = genai.Client(api_key=api_key)
    return _genai_client


# Agents use gemini-2.0-flash (free tier: 1500 requests/day)
# Summarize endpoint uses its own MODEL env var (gemini-2.5-flash)
_AGENT_MODEL = os.environ.get("AGENT_MODEL", "gemini-2.0-flash")


class AgentState(TypedDict):
    session_id: str
    summary: str
    active_agents: List[str]
    agent_outputs: Annotated[Dict[str, Any], operator.ior]
    summary_data: Optional[Dict[str, Any]]
    merged_solution: Optional[Dict[str, Any]]
    iteration_count: int
    is_validated: bool
    final_spec: Optional[str]
    pdf_url: Optional[str]


async def _call_gemini(system_prompt: str, user_text: str) -> str:
    client = _get_client()
    response = await client.aio.models.generate_content(
        model=_AGENT_MODEL,
        contents=f"{system_prompt}\n\n{user_text}",
    )
    return response.text.strip()


async def context_loader(state: AgentState):
    row = await fetch_summary(state["session_id"])
    return {
        "summary": row.get("core_problem", ""),
        "summary_data": row,
        "active_agents": [],
        "agent_outputs": {},
        "merged_solution": None,
        "iteration_count": 0,
        "is_validated": False,
        "final_spec": None,
        "pdf_url": None,
    }


async def master_router(state: AgentState):
    summary_data = state.get("summary_data") or {}
    detected = summary_data.get("detected_domains", [])
    if isinstance(detected, str):
        detected = json.loads(detected)

    agents = ["business_analyst", "tech_architect"]
    domain_map = {
        "legal": "legal_compliance",
        "compliance": "legal_compliance",
        "regulatory": "legal_compliance",
        "health": "healthcare_specialist",
        "healthcare": "healthcare_specialist",
        "finance": "finance_specialist",
        "financial": "finance_specialist",
    }
    for d in detected:
        dl = d.lower().strip()
        for key, agent in domain_map.items():
            if key in dl and agent not in agents:
                agents.append(agent)

    logger.info("master_router: detected_domains=%s -> agents=%s", detected, agents)
    return {"active_agents": agents}


async def business_analyst(state: AgentState):
    if "business_analyst" not in state.get("active_agents", []):
        return {}
    summary_data = state.get("summary_data") or {}
    system_prompt = (
        "You are a senior business analyst. Given the session summary below, "
        "produce a structured business analysis in valid JSON ONLY. "
        "No markdown, no backticks, no commentary.\n\n"
        "Fields:\n"
        '- "market_context": string — industry landscape and market positioning\n'
        '- "stakeholder_analysis": string — key stakeholders and their interests\n'
        '- "business_risks": list of strings — top 3-5 business risks\n'
        '- "success_metrics": list of strings — measurable KPIs\n'
        '- "roi_analysis": string — expected return on investment justification\n'
        '- "key_recommendations": list of strings — actionable business recommendations'
    )
    transcript = json.dumps(summary_data, ensure_ascii=False, default=str)
    text = await _call_gemini(system_prompt, f"Session Summary:\n{transcript}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("business_analyst: Gemini returned non-JSON, wrapping raw text")
        parsed = {"raw_analysis": text}
    return {"agent_outputs": {"business_analyst": parsed}}


async def tech_architect(state: AgentState):
    if "tech_architect" not in state.get("active_agents", []):
        return {}
    summary_data = state.get("summary_data") or {}
    system_prompt = (
        "You are a senior technology architect. Given the session summary below, "
        "produce a structured technology architecture analysis in valid JSON ONLY. "
        "No markdown, no backticks, no commentary.\n\n"
        "Fields:\n"
        '- "system_architecture": string — high-level architecture description\n'
        '- "tech_stack": list of strings — recommended technologies\n'
        '- "integration_points": list of strings — key integrations needed\n'
        '- "scalability_considerations": string — scaling strategy\n'
        '- "security_requirements": list of strings — security and compliance needs\n'
        '- "implementation_phases": list of strings — phased delivery approach'
    )
    transcript = json.dumps(summary_data, ensure_ascii=False, default=str)
    text = await _call_gemini(system_prompt, f"Session Summary:\n{transcript}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("tech_architect: Gemini returned non-JSON, wrapping raw text")
        parsed = {"raw_analysis": text}
    return {"agent_outputs": {"tech_architect": parsed}}


async def legal_compliance(state: AgentState):
    if "legal_compliance" not in state.get("active_agents", []):
        return {}
    summary_data = state.get("summary_data") or {}
    system_prompt = (
        "You are a legal and compliance expert. Given the session summary below, "
        "produce a structured compliance analysis in valid JSON ONLY. "
        "No markdown, no backticks, no commentary.\n\n"
        "Fields:\n"
        '- "applicable_regulations": list of strings\n'
        '- "compliance_risks": list of strings\n'
        '- "required_actions": list of strings\n'
        '- "jurisdictional_notes": string'
    )
    transcript = json.dumps(summary_data, ensure_ascii=False, default=str)
    text = await _call_gemini(system_prompt, f"Session Summary:\n{transcript}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("legal_compliance: Gemini returned non-JSON, wrapping raw text")
        parsed = {"raw_analysis": text}
    return {"agent_outputs": {"legal_compliance": parsed}}


async def healthcare_specialist(state: AgentState):
    if "healthcare_specialist" not in state.get("active_agents", []):
        return {}
    summary_data = state.get("summary_data") or {}
    system_prompt = (
        "You are a healthcare domain expert. Given the session summary below, "
        "produce a structured healthcare analysis in valid JSON ONLY. "
        "No markdown, no backticks, no commentary.\n\n"
        "Fields:\n"
        '- "clinical_requirements": list of strings\n'
        '- "regulatory_compliance": list of strings (e.g. HIPAA, GDPR)\n'
        '- "data_privacy_concerns": list of strings\n'
        '- "integration_with_his": string — health information systems integration'
    )
    transcript = json.dumps(summary_data, ensure_ascii=False, default=str)
    text = await _call_gemini(system_prompt, f"Session Summary:\n{transcript}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("healthcare_specialist: Gemini returned non-JSON, wrapping raw text")
        parsed = {"raw_analysis": text}
    return {"agent_outputs": {"healthcare_specialist": parsed}}


async def finance_specialist(state: AgentState):
    if "finance_specialist" not in state.get("active_agents", []):
        return {}
    summary_data = state.get("summary_data") or {}
    system_prompt = (
        "You are a finance domain expert. Given the session summary below, "
        "produce a structured financial analysis in valid JSON ONLY. "
        "No markdown, no backticks, no commentary.\n\n"
        "Fields:\n"
        '- "budget_estimation": string\n'
        '- "cost_breakdown": list of strings\n'
        '- "funding_options": list of strings\n'
        '- "financial_risks": list of strings\n'
        '- "roi_timeline": string'
    )
    transcript = json.dumps(summary_data, ensure_ascii=False, default=str)
    text = await _call_gemini(system_prompt, f"Session Summary:\n{transcript}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("finance_specialist: Gemini returned non-JSON, wrapping raw text")
        parsed = {"raw_analysis": text}
    return {"agent_outputs": {"finance_specialist": parsed}}


async def solution_merger(state: AgentState):
    agent_outputs = state.get("agent_outputs", {})
    summary_data = state.get("summary_data") or {}

    system_prompt = (
        "You are a senior solution architect. Combine all agent analyses below "
        "into a single structured solution document in valid JSON ONLY. "
        "No markdown, no backticks, no commentary.\n\n"
        "Output JSON fields:\n"
        '- "executive_summary": string — 2-3 paragraph summary of the complete solution\n'
        '- "implementation_roadmap": list of strings — numbered implementation steps in order\n'
        '- "key_deliverables": list of strings\n'
        '- "risk_assessment": string\n'
        '- "estimated_timeline": string\n'
        '- "next_steps": list of strings'
    )
    payload = {
        "session_summary": summary_data,
        "agent_findings": agent_outputs,
    }
    text = await _call_gemini(system_prompt, json.dumps(payload, ensure_ascii=False, default=str))
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        logger.warning("solution_merger: Gemini returned non-JSON, wrapping")
        parsed = {
            "executive_summary": text[:500],
            "implementation_roadmap": [],
        }

    return {"merged_solution": parsed}


async def validator(state: AgentState):
    merged = state.get("merged_solution")
    iteration = state.get("iteration_count", 0) + 1
    max_iterations = 3

    if iteration >= max_iterations:
        logger.info("validator: max iterations (%d) reached, ending", max_iterations)
        return {"is_validated": True, "iteration_count": iteration}

    if not merged or not isinstance(merged, dict):
        logger.info("validator: merged_solution invalid, re-routing (iteration %d)", iteration)
        return {"is_validated": False, "iteration_count": iteration}

    has_summary = bool(merged.get("executive_summary"))
    has_roadmap = bool(merged.get("implementation_roadmap"))
    if has_summary and has_roadmap:
        logger.info("validator: validated (executive_summary + implementation_roadmap present)")
        return {"is_validated": True, "iteration_count": iteration}

    logger.info(
        "validator: missing fields (summary=%s, roadmap=%s), re-routing (iteration %d)",
        has_summary, has_roadmap, iteration,
    )
    return {"is_validated": False, "iteration_count": iteration}


workflow = StateGraph(AgentState)
workflow.add_node("context_loader", context_loader)
workflow.add_node("master_router", master_router)
workflow.add_node("business_analyst", business_analyst)
workflow.add_node("tech_architect", tech_architect)
workflow.add_node("legal_compliance", legal_compliance)
workflow.add_node("healthcare_specialist", healthcare_specialist)
workflow.add_node("finance_specialist", finance_specialist)
workflow.add_node("solution_merger", solution_merger)
workflow.add_node("validator", validator)

workflow.set_entry_point("context_loader")
workflow.add_edge("context_loader", "master_router")

# Master router fans out to all possible specialist agents.
# Each agent checks its own `active_agents` list and becomes a no-op if not selected.
workflow.add_edge("master_router", "business_analyst")
workflow.add_edge("master_router", "tech_architect")
workflow.add_edge("master_router", "legal_compliance")
workflow.add_edge("master_router", "healthcare_specialist")
workflow.add_edge("master_router", "finance_specialist")

workflow.add_edge("business_analyst", "solution_merger")
workflow.add_edge("tech_architect", "solution_merger")
workflow.add_edge("legal_compliance", "solution_merger")
workflow.add_edge("healthcare_specialist", "solution_merger")
workflow.add_edge("finance_specialist", "solution_merger")
workflow.add_edge("solution_merger", "validator")
workflow.add_conditional_edges(
    "validator",
    lambda x: "end" if x["is_validated"] else "master_router",
    {"end": END, "master_router": "master_router"},
)

app = workflow.compile()
