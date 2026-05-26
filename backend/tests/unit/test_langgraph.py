import pytest
from backend.src.agents.langgraph_flow import app

@pytest.mark.asyncio
async def test_langgraph_flow():
    initial_state = {"session_id": "test-session", "iteration_count": 0, "is_validated": False}
    final_state = await app.ainvoke(initial_state)
    
    assert final_state["is_validated"] is True
    assert "business_analyst" in final_state["agent_outputs"]
    assert "tech_architect" in final_state["agent_outputs"]
    assert final_state["merged_solution"] == "Merged solution..."
