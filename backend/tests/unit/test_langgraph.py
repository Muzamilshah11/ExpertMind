import pytest
from unittest.mock import patch, AsyncMock
from backend.src.agents.langgraph_flow import app

@pytest.mark.asyncio
async def test_langgraph_flow():
    initial_state = {"session_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef", "iteration_count": 0, "is_validated": False}
    
    mock_session_summary = {
        "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "core_problem": "Test Problem",
        "detected_domains": ["business"],
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
    }

    mock_gemini_response = '{"key": "value"}'
    
    with patch("backend.src.agents.langgraph_flow.fetch_summary", new_callable=AsyncMock) as mock_fetch_summary, \
         patch("backend.src.agents.langgraph_flow._call_gemini", new_callable=AsyncMock) as mock_call_gemini:
        mock_fetch_summary.return_value = mock_session_summary
        mock_call_gemini.return_value = mock_gemini_response
        final_state = await app.ainvoke(initial_state)
    
    assert final_state["is_validated"] is True
    assert "business_analyst" in final_state["agent_outputs"]
    assert "tech_architect" in final_state["agent_outputs"]
    assert final_state["merged_solution"] == {"key": "value"}
