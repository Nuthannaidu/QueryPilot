#!/usr/bin/env bash
#
# One-command launcher for the AI SQL Query Generator.
# Starts Postgres (Docker), Ollama, the FastAPI backend, and the React frontend.
# Logs go to ./logs/. Run ./stop.sh to shut everything down.

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
mkdir -p logs

MODEL="qwen2.5-coder:7b"

echo "▸ AI SQL Query Generator — starting up"
echo

# --- 1. Docker / Postgres ------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  echo "  Docker isn't running — launching Docker Desktop…"
  open -a Docker
  printf "  Waiting for Docker"
  until docker info >/dev/null 2>&1; do printf "."; sleep 2; done
  echo
fi
echo "✓ Docker is running"

docker compose up -d >/dev/null
printf "  Waiting for Postgres to be ready"
until docker exec ai_sql_db pg_isready -U admin -d company >/dev/null 2>&1; do
  printf "."; sleep 1
done
echo
echo "✓ PostgreSQL is up (localhost:5433)"

# --- 2. Ollama -----------------------------------------------------------
if ! pgrep -x ollama >/dev/null; then
  echo "  Starting Ollama…"
  ollama serve > logs/ollama.log 2>&1 &
  sleep 2
fi
if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo "  Pulling model $MODEL (first run only, ~4.7GB)…"
  ollama pull "$MODEL"
fi
echo "✓ Ollama ready with $MODEL"

# --- 3. Backend ----------------------------------------------------------
if [ ! -d backend/.venv ]; then
  echo "  Creating Python venv + installing deps (first run only)…"
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
[ -f backend/.env ] || cp backend/.env.example backend/.env
( cd backend && .venv/bin/uvicorn main:app --reload --port 8000 > ../logs/backend.log 2>&1 & )
echo "✓ Backend starting on http://localhost:8000"

# --- 4. Frontend ---------------------------------------------------------
if [ ! -d frontend/node_modules ]; then
  echo "  Installing frontend deps (first run only)…"
  ( cd frontend && npm install --silent )
fi
( cd frontend && npm run dev > ../logs/frontend.log 2>&1 & )
echo "✓ Frontend starting on http://localhost:5173"

echo
echo "─────────────────────────────────────────────"
echo "  Open:  http://localhost:5173"
echo "  Logs:  ./logs/{backend,frontend,ollama}.log"
echo "  Stop:  ./stop.sh"
echo "─────────────────────────────────────────────"
