# ExpertMind Project

ExpertMind is an advanced AI consulting platform designed to provide expert analysis and solutions across various domains. It leverages a multi-agent LangGraph architecture to orchestrate specialized AI agents (Business Analyst, Tech Architect, Legal Compliance, Healthcare Specialist, Finance Specialist) to process session summaries, generate structured insights, and propose comprehensive solutions. The platform features a real-time interactive frontend built with Next.js and a FastAPI backend with WebSocket capabilities.

## Features

-   **Multi-Agent Orchestration**: Utilizes LangGraph to dynamically delegate tasks to specialized AI agents.
-   **Real-time Interaction**: WebSocket-based communication for live sessions.
-   **Structured Analysis**: Agents produce structured JSON outputs for business, technical, legal, healthcare, and financial domains.
-   **Solution Merging**: Consolidates agent analyses into a single, comprehensive solution document.
-   **PDF Report Generation**: Generates detailed PDF reports of session outcomes.
-   **Interactive Frontend**: User-friendly interface for managing sessions and viewing reports.

## Project Structure

-   `backend/`: FastAPI application, LangGraph agents, database models, and services.
    -   `backend/src/agents/`: LangGraph flow and agent definitions.
    -   `backend/src/db.py`: Database connection and utility functions.
    -   `backend/src/models.py`: SQLModel and Pydantic models for database and API.
    -   `backend/src/services/pdf_generator.py`: PDF report generation logic.
    -   `backend/tests/`: Unit and integration tests for the backend.
-   `frontend/`: Next.js application for the user interface.
    -   `frontend/app/`: Next.js pages and layouts.
    -   `frontend/components/`: React components, including `LiveSession.tsx`.
-   `.specify/`: Configuration and templates for project specifications and documentation.
-   `history/`: Stores prompt history records and architectural decision records.
-   `requirements.txt`: Python dependencies for the backend.
-   `package.json`: JavaScript dependencies for the frontend.
-   `run_backend.py`: Script to start the FastAPI backend.

## Setup Instructions

Follow these steps to set up the project locally:

### Prerequisites

-   Python 3.10+
-   Node.js (LTS recommended)
-   npm (comes with Node.js)
-   Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ExpertMind
```

### 2. Backend Setup

```bash
# Create a Python virtual environment (recommended)
python -m venv venv
# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

#### Database Configuration

This project uses `asyncpg` for PostgreSQL. You need to set the `DATABASE_URL` environment variable.
Create a `.env` file in the root directory of the project with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://user:password@host:port/database_name"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY" # Required for AI agent functionality
```
Replace `user`, `password`, `host`, `port`, and `database_name` with your PostgreSQL credentials.
A `GEMINI_API_KEY` is also required for the AI agents to function.

#### Database Migrations

Apply database migrations using Alembic:
```bash
# Navigate to the backend directory
cd backend
alembic upgrade head
cd ..
```

### 3. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend
# Install Node.js dependencies
npm install
# Go back to the root directory
cd ..
```

## How to Run the Project

### 1. Start the Backend Server

Open a terminal in the project root directory and run:

```bash
.\venv\Scripts\python run_backend.py # On Windows
# Or on macOS/Linux (after activating venv):
python run_backend.py
```
The backend server will start on `http://127.0.0.1:8000`.

### 2. Start the Frontend Development Server

Open a **separate** terminal, navigate to the `frontend` directory (`cd frontend`), and run:

```bash
npm run dev
```
The frontend application will typically open in your browser at `http://localhost:3000`. If this port is in use, it will use another available port (e.g., `http://localhost:3002`). Check your terminal for the exact URL.

## How to Run Tests

### Backend Tests

Run all backend unit and integration tests from the project root directory:

```bash
.\venv\Scripts\python -m pytest backend/tests # On Windows
# Or on macOS/Linux (after activating venv):
python -m pytest backend/tests
```

### Frontend Tests

Run all frontend tests from the `frontend` directory:

```bash
cd frontend
npm run test
cd ..
```

## Known Issues & Considerations

-   **WeasyPrint System Dependencies**: PDF generation functionality relies on `WeasyPrint`, which requires external system libraries (like Pango, Cairo, GDK-Pixbuf). If PDF generation fails, you may need to install these dependencies on your operating system. For Windows, refer to the `WeasyPrint` documentation for installation instructions.
-   **API Keys**: Ensure your `GEMINI_API_KEY` is correctly configured in your `.env` file for AI agent functionality.

---
**Note**: This `README.md` was generated by Gemini CLI based on the project structure and observed behavior.
