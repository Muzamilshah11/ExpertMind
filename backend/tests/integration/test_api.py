from fastapi.testclient import TestClient
import os

# Set environment before importing app
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["GEMINI_API_KEY"] = "dummy_key"

from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
