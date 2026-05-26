from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import os

# Assuming templates are in a 'templates' directory in backend/
env = Environment(loader=FileSystemLoader('templates'))

async def generate_pdf(state: dict) -> bytes:
    template = env.get_template('report.html')
    html_out = template.render(state=state)
    return HTML(string=html_out).write_pdf()
