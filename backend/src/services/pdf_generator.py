import os
from jinja2 import Environment, FileSystemLoader


def _get_env():
    return Environment(loader=FileSystemLoader('templates'))


def _get_html():
    from weasyprint import HTML
    return HTML


async def generate_pdf(state: dict) -> bytes:
    template = _get_env().get_template('report.html')
    html_out = template.render(state=state)
    HTML = _get_html()
    return HTML(string=html_out).write_pdf()
