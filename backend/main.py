import logging
import asyncio
import json
import os
import base64
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from sqlmodel import create_engine, Session, SQLModel, select
from dotenv import load_dotenv
from google import genai
from google.genai import types

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.models import User, SessionSummary, AgentRun, SummarizeRequest, SummarizeResponse, OrchestrateRequest, OrchestrateResponse, GeneratePDFRequest, GeneratePDFResponse
from gemini_live import GeminiLive
from src.agents.langgraph_flow import app as langgraph_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from weasyprint import HTML
    HTML
    from src.services.pdf_generator import generate_pdf
    logger.info("WeasyPrint is available, PDF generation enabled.")
except (OSError, ImportError):
    logger.warning("WeasyPrint dependencies not found, PDF generation disabled.")
    async def generate_pdf(state: dict) -> bytes:
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

app = FastAPI(lifespan=lifespan)

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
async def summarize(request: SummarizeRequest, db: Session = Depends(get_session)):
    prompt = f"Summarize the following session transcript:\n{request.session_transcript}"

    response = genai_client.models.generate_content(
        model=os.getenv("MODEL", "gemini-2.5-flash"),
        contents=prompt
    )

    summary_data = json.loads(response.text)

    new_summary = SessionSummary(
        user_id=request.user_id,
        core_problem=summary_data.get("core_problem", "Unknown"),
        summary=response.text,
        sessionDuration=request.session_duration,
        status="summarized"
    )

    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)

    return {"session_id": new_summary.id, "status": "summarized"}

@app.post("/api/orchestrate", response_model=OrchestrateResponse)
async def orchestrate(request: OrchestrateRequest, db: Session = Depends(get_session)):
    initial_state = {"session_id": str(request.session_id), "iteration_count": 0, "is_validated": False}
    final_state = await langgraph_app.ainvoke(initial_state)

    summary = db.exec(select(SessionSummary).where(SessionSummary.id == request.session_id)).first()
    if summary:
        summary.status = "orchestrated"
        summary.langgraph_state = final_state
        db.add(summary)
        db.commit()

    return {"session_id": request.session_id, "status": "orchestrated"}

@app.post("/api/generate-pdf", response_model=GeneratePDFResponse)
async def generate_pdf_endpoint(request: GeneratePDFRequest, db: Session = Depends(get_session)):
    pdf_bytes = await generate_pdf(request.state)

    pdf_url = "https://r2.example.com/reports/report.pdf"

    return {"pdf_url": pdf_url}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    audio_queue = asyncio.Queue()
    video_queue = asyncio.Queue()
    text_queue = asyncio.Queue()

    text_queue.put_nowait("ہیلو")

    async def audio_callback(data):
        await websocket.send_bytes(data)

    async def interrupt_callback():
        await websocket.send_json({"type": "interrupted"})

    gemini_live = GeminiLive(
        api_key=os.getenv("GEMINI_API_KEY", ""),
        model=os.getenv("LIVE_MODEL", "gemini-3.1-flash-live-preview"),
        input_sample_rate=16000,
        voice_name="Puck"
    )

    async def session_task_runner():
        try:
            async for event in gemini_live.start_session(
                audio_queue, video_queue, text_queue,
                audio_callback, interrupt_callback
            ):
                await websocket.send_json(event)
        except Exception as e:
            logger.error(f"Gemini session error: {e}")
            await websocket.send_json({"type": "error", "error": str(e)})

    async def receiver_task_runner():
        try:
            while True:
                data = await websocket.receive()
                if "text" in data:
                    message = json.loads(data["text"])
                    if message["type"] == "settings":
                        pass
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
