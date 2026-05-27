import pytest
from unittest.mock import patch, MagicMock, AsyncMock


@pytest.mark.asyncio
async def test_generate_pdf_success():
    state = {
        "session_id": "test-session",
        "merged_solution": "Test solution",
        "final_spec": "Test spec"
    }

    mock_template = MagicMock()
    mock_template.render.return_value = "<html>mocked</html>"

    mock_env = MagicMock()
    mock_env.get_template.return_value = mock_template

    mock_html_instance = MagicMock()
    mock_html_instance.write_pdf.return_value = b"%PDF-1.4 mock pdf content"

    mock_html_class = MagicMock(return_value=mock_html_instance)

    with patch("backend.src.services.pdf_generator._get_env", return_value=mock_env), \
         patch("backend.src.services.pdf_generator._get_html", return_value=mock_html_class):
        from backend.src.services.pdf_generator import generate_pdf
        pdf_bytes = await generate_pdf(state)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes == b"%PDF-1.4 mock pdf content"
        mock_env.get_template.assert_called_once_with("report.html")
        mock_template.render.assert_called_once_with(state=state)
        mock_html_class.assert_called_once_with(string="<html>mocked</html>")
        mock_html_instance.write_pdf.assert_called_once()
