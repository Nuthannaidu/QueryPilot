# AI SQL Query Generator

Ask a question in plain English → get a PostgreSQL query, run it against a real
database, and see the results plus a plain-English explanation.

Runs entirely locally on a **free, local LLM** (Ollama) — no API keys, no cost.

## What makes it more than a wrapper

- **Schema-aware** — introspects the live database and feeds the real tables /
  columns to the model, so it generates valid queries instead of guessing.
- **Self-correcting loop** — if the generated SQL errors, the exact Postgres
  error is fed back to the model and it retries (up to `MAX_SQL_RETRIES`). The UI
  shows what failed and how it recovered.
- **Safety guardrails (defense-in-depth)**:
  1. The app connects as a **read-only** Postgres role.
  2. An application-level guard rejects anything but a single `SELECT`
     (blocks `DROP/DELETE/UPDATE`, stacked statements, etc.).
  3. A row `LIMIT` is enforced on every query.
- **Explains the query and the data** — describes what the SQL does *and*
  summarizes the actual results.

## Architecture

```
React (Vite)  ──►  FastAPI  ──►  Ollama (qwen2.5-coder)   [generate SQL]
                       │
                       └──────►  PostgreSQL (read-only)    [run SQL]
```

## Prerequisites

- Docker (for PostgreSQL)
- Ollama (`brew install ollama`)
- Python 3.11+
- Node 18+

## Setup

```bash
# 1. Start Postgres (seeded with a sample company DB)
docker compose up -d

# 2. Start Ollama and pull the model
ollama serve &            # if not already running
ollama pull qwen2.5-coder:7b

# 3. Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Example questions

- Find employees earning more than the average salary
- Which department has the highest total salary?
- List employees hired in 2022 with their department name
- Show the top 3 highest paid employees and their managers
