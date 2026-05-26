from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, END
import operator

class AgentState(TypedDict):
    session_id: str
    summary: str
    active_agents: List[str]
    agent_outputs: Annotated[Dict[str, str], operator.ior] # Use reducer
    merged_solution: Optional[str]
    iteration_count: int
    is_validated: bool
    final_spec: Optional[str]
    pdf_url: Optional[str]

async def context_loader(state: AgentState):
    # Fetch summary from DB
    return {"summary": "Context loaded..."}

async def master_router(state: AgentState):
    # Determine agents
    return {"active_agents": ["business_analyst", "tech_architect"]}

async def business_analyst(state: AgentState):
    return {"agent_outputs": {"business_analyst": "Business analysis..."}}

async def tech_architect(state: AgentState):
    return {"agent_outputs": {"tech_architect": "Tech architecture..."}}

async def solution_merger(state: AgentState):
    return {"merged_solution": "Merged solution..."}

async def validator(state: AgentState):
    return {"is_validated": True, "iteration_count": state.get("iteration_count", 0) + 1}

# Graph Construction
workflow = StateGraph(AgentState)
workflow.add_node("context_loader", context_loader)
workflow.add_node("master_router", master_router)
workflow.add_node("business_analyst", business_analyst)
workflow.add_node("tech_architect", tech_architect)
workflow.add_node("solution_merger", solution_merger)
workflow.add_node("validator", validator)

workflow.set_entry_point("context_loader")
workflow.add_edge("context_loader", "master_router")
workflow.add_edge("master_router", "business_analyst")
workflow.add_edge("master_router", "tech_architect")
workflow.add_edge("business_analyst", "solution_merger")
workflow.add_edge("tech_architect", "solution_merger")
workflow.add_edge("solution_merger", "validator")
workflow.add_conditional_edges("validator", lambda x: "end" if x["is_validated"] else "master_router", {"end": END, "master_router": "master_router"})

app = workflow.compile()
