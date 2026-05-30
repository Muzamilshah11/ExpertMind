import logging
import asyncio
import json
import os
import uuid
import base64
import sys
import tempfile
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import create_engine, Session, SQLModel, select
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models import User, SessionSummary, AgentRun, SummarizeRequest, SummarizeResponse, SummaryParseResult, OrchestrateRequest, OrchestrateResponse, GeneratePDFRequest, GeneratePDFResponse
from gemini_live import GeminiLive
from src.agents.langgraph_flow import app as langgraph_app, AgentState
from src.db import get_pool, update_pdf_url

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from weasyprint import HTML
    HTML
    from src.services.pdf_generator import generate_pdf
    logger.info("WeasyPrint is available, PDF generation enabled.")
except (OSError, ImportError):
    logger.warning("WeasyPrint dependencies not found, PDF generation disabled.")
    async def generate_pdf(payload: dict) -> bytes:
        return b"%PDF-1.0 Dummy PDF content"

root_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(root_env_path):
    load_dotenv(dotenv_path=root_env_path)

backend_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(backend_env_path):
    load_dotenv(dotenv_path=backend_env_path, override=True)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost/dbname")
engine = create_engine(DATABASE_URL, echo=True)

genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_session():
    with Session(engine) as session:
        yield session

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up FastAPI application...")
    SQLModel.metadata.create_all(engine)
    yield
    logger.info("Shutting down FastAPI application...")

PDF_DIR = os.path.join(tempfile.gettempdir(), "expertmind_reports")
os.makedirs(PDF_DIR, exist_ok=True)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/reports", StaticFiles(directory=PDF_DIR), name="reports")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "Internal Server Error"},
    )

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    system_prompt = (
        "You are a structured data extraction assistant. "
        "Extract the following fields from the session transcript as valid JSON. "
        "Respond with ONLY valid JSON, no markdown, no backticks, no commentary.\n\n"
        "Fields:\n"
        "- core_problem (string): the primary problem described\n"
        "- business_context (string): relevant business background\n"
        "- technical_constraints (list of strings)\n"
        "- regulatory_requirements (list of strings)\n"
        "- success_criteria (list of strings)\n"
        "- detected_domains (list of strings): e.g. technology, healthcare, finance\n"
        "- extracted_artifacts (list): any documents, metrics, or references mentioned\n"
        "- confidence_score (float 0.0-1.0): how confident you are in the extraction"
    )

    response = await genai_client.aio.models.generate_content(
        model=os.getenv("MODEL", "gemini-2.5-flash"),
        contents=f"{system_prompt}\n\nTranscript:\n{request.session_transcript}"
    )

    summary_data = SummaryParseResult.model_validate_json(response.text)

    session_id = uuid.uuid4()
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO session_summaries
                (id, user_id, core_problem, business_context,
                 technical_constraints, regulatory_requirements,
                 success_criteria, detected_domains,
                 extracted_artifacts, confidence_score, status)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)
            """,
            session_id,
            uuid.UUID(request.user_id) if isinstance(request.user_id, str) else request.user_id,
            summary_data.core_problem,
            summary_data.business_context,
            json.dumps(summary_data.technical_constraints),
            json.dumps(summary_data.regulatory_requirements),
            json.dumps(summary_data.success_criteria),
            json.dumps(summary_data.detected_domains),
            json.dumps(summary_data.extracted_artifacts),
            summary_data.confidence_score,
            "summarized",
        )

    logger.info(
        "Session summarized: %s (user=%s, confidence=%.2f)",
        session_id, request.user_id, summary_data.confidence_score,
    )

    return {"session_id": str(session_id), "status": "summarized"}

@app.post("/api/orchestrate", response_model=OrchestrateResponse)
async def orchestrate(request: OrchestrateRequest):
    initial_state: AgentState = {
        "session_id": request.session_id,
        "summary": "",
        "active_agents": [],
        "agent_outputs": {},
        "summary_data": None,
        "merged_solution": {},
        "iteration_count": 0,
        "is_validated": False,
        "final_spec": {},
        "pdf_url": "",
    }

    final_state = await langgraph_app.ainvoke(initial_state)

    merged = final_state.get("merged_solution") or {}

    return {
        "session_id": final_state["session_id"],
        "pdf_url": final_state.get("pdf_url") or "",
        "final_spec": final_state.get("final_spec") or {},
        "executive_summary": merged.get("executive_summary", ""),
        "implementation_roadmap": merged.get("implementation_roadmap", []),
        "agent_outputs": final_state.get("agent_outputs", {}),
    }

@app.post("/api/generate-pdf", response_model=GeneratePDFResponse)
async def generate_pdf_endpoint(request: GeneratePDFRequest):
    pdf_bytes = await generate_pdf(request.state)

    session_id = request.state.get("session_id", uuid.uuid4().hex)
    file_name = f"{session_id}_report.pdf"
    file_path = os.path.join(PDF_DIR, file_name)
    pdf_url_path = f"/reports/{file_name}"

    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    await update_pdf_url(session_id, pdf_url_path)

    logger.info("PDF saved: %s (%d bytes)", file_path, len(pdf_bytes))

    return {"pdf_url": pdf_url_path, "status": "generated"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Wait for initial settings from frontend before starting Gemini session
    voice_name = "Puck"
    system_prompt = None
    try:
        data = await asyncio.wait_for(websocket.receive(), timeout=5.0)
        while "text" in data:
            msg = json.loads(data["text"])
            if msg.get("type") == "settings":
                sd = msg.get("data", {})
                voice_name = sd.get("voice", voice_name)
                system_prompt = sd.get("systemPrompt", system_prompt)
                break
            data = await asyncio.wait_for(websocket.receive(), timeout=5.0)
    except (asyncio.TimeoutError, WebSocketDisconnect):
        pass

    while True:
        audio_queue = asyncio.Queue()
        video_queue = asyncio.Queue()
        text_queue = asyncio.Queue()

        text_queue.put_nowait("ہیلو")

        restart_requested = False

        async def audio_callback(data):
            await websocket.send_bytes(data)

        async def interrupt_callback():
            await websocket.send_json({"type": "interrupted"})

        gemini_live = GeminiLive(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model=os.getenv("LIVE_MODEL", "gemini-3.1-flash-live-preview"),
            input_sample_rate=16000,
            voice_name=voice_name,
        )
        if system_prompt:
            gemini_live.system_instruction = system_prompt

        async def session_task_runner():
            nonlocal restart_requested
            try:
                async for event in gemini_live.start_session(
                    audio_queue, video_queue, text_queue,
                    audio_callback, interrupt_callback
                ):
                    if restart_requested:
                        break
                    await websocket.send_json(event)
            except Exception as e:
                logger.error(f"Gemini session error: {e}")
                if not restart_requested:
                    await websocket.send_json({"type": "error", "error": str(e)})

        async def receiver_task_runner():
            nonlocal voice_name, system_prompt, restart_requested
            try:
                while True:
                    data = await websocket.receive()
                    if "text" in data:
                        message = json.loads(data["text"])
                        if message["type"] == "settings":
                            sd = message.get("data", {})
                            voice_name = sd.get("voice", voice_name)
                            system_prompt = sd.get("systemPrompt", system_prompt)
                            restart_requested = True
                            await websocket.send_json({"type": "voice_changed", "voice": voice_name})
                            logger.info(f"Voice change requested: {voice_name}")
                            break
                        elif message["type"] == "image":
                            await video_queue.put(base64.b64decode(message["data"]))
                        elif message["type"] == "text":
                            await text_queue.put(message["data"])
                    elif "bytes" in data:
                        chunk = data["bytes"]
                        logger.info(f"Received audio chunk: {len(chunk)} bytes")
                        await audio_queue.put(chunk)
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")

        tasks = [
            asyncio.create_task(session_task_runner()),
            asyncio.create_task(receiver_task_runner())
        ]

        try:
            await asyncio.gather(*tasks)
        finally:
            for t in tasks:
                t.cancel()

        if not restart_requested:
            break

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
