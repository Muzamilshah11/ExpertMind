import logging
from datetime import date
from weasyprint import HTML

logger = logging.getLogger(__name__)


def _build_html(payload: dict) -> str:
    session_id = payload.get("session_id", "unknown")
    today = date.today().isoformat()
    summary = payload.get("summary", {}) or {}
    merged = payload.get("merged_solution", {}) or {}
    agent_outputs = payload.get("agent_outputs", {}) or {}
    final_spec = payload.get("final_spec", {}) or {}

    exec_summary = ""
    if isinstance(merged, dict):
        exec_summary = merged.get("executive_summary", "")
    elif isinstance(merged, str):
        exec_summary = merged

    roadmap = []
    if isinstance(merged, dict):
        roadmap = merged.get("implementation_roadmap", [])
    elif isinstance(merged, str):
        roadmap = []

    core_problem = summary.get("core_problem", "")
    business_context = summary.get("business_context", "")

    agent_sections = ""
    for agent_name, output in agent_outputs.items():
        if isinstance(output, dict):
            output_text = str(output)
        else:
            output_text = str(output)
        agent_sections += f"<h2>{agent_name.replace('_', ' ').title()}</h2><p>{output_text}</p>"

    roadmap_items = ""
    for i, item in enumerate(roadmap, 1):
        roadmap_items += f"<li>{item}</li>"

    sp_constitution = final_spec.get("sp_constitution", "")
    sp_specify = final_spec.get("sp_specify", "")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #333; }}
  h1 {{ color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 8px; }}
  h2 {{ color: #2563eb; margin-top: 30px; }}
  .cover {{ text-align: center; padding: 100px 0; }}
  .cover h1 {{ font-size: 36px; border: none; }}
  .cover .meta {{ color: #666; margin-top: 20px; }}
  pre {{ background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }}
  li {{ margin-bottom: 6px; }}
  .section {{ page-break-before: always; }}
  .no-break {{ page-break-before: avoid; }}
</style>
</head>
<body>
<div class="cover">
  <h1>ExpertMind Report</h1>
  <p class="meta">Session: {session_id}</p>
  <p class="meta">Date: {today}</p>
</div>

<div class="section">
<h1>1. Executive Summary</h1>
<p>{exec_summary}</p>
</div>

<div class="section">
<h1>2. Problem Analysis</h1>
<h2>Core Problem</h2>
<p>{core_problem}</p>
<h2>Business Context</h2>
<p>{business_context}</p>
</div>

<div class="section">
<h1>3. Agent Findings</h1>
{agent_sections}
</div>

<div class="section">
<h1>4. Implementation Roadmap</h1>
<ol>{roadmap_items}</ol>
</div>

<div class="section">
<h1>5. Appendix</h1>
<h2>Constitution</h2>
<pre>{sp_constitution}</pre>
<h2>Specify Output</h2>
<pre>{sp_specify}</pre>
</div>
</body>
</html>"""


async def generate_pdf(payload: dict) -> bytes:
    html_str = _build_html(payload)
    pdf_bytes = HTML(string=html_str).write_pdf()
    logger.info("PDF generated (%d bytes)", len(pdf_bytes))
    return pdf_bytes
