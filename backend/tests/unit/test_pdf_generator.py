import pytest
import asyncio
from backend.src.services.pdf_generator import generate_pdf

@pytest.mark.asyncio
async def test_generate_pdf():
    state = {
        "session_id": "test-session",
        "merged_solution": "Test solution",
        "final_spec": "Test spec"
    }
    
    # We need to mock Jinja2 environment loading to avoid file system dependency
    # For now, just test that the function executes without error if the template exists.
    # In a real test, we would provide a mock template loader.
    
    try:
        pdf_bytes = await generate_pdf(state)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
    except Exception as e:
        pytest.fail(f"PDF generation failed: {e}")
