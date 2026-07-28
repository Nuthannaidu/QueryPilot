#!/usr/bin/env bash
#
# Stops everything started by start.sh.
# By default leaves Ollama running (it's a shared system service).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "▸ Shutting down…"

# Backend (uvicorn on port 8000)
pkill -f "uvicorn main:app" 2>/dev/null && echo "✓ Backend stopped" || echo "· Backend not running"

# Frontend (vite dev server)
pkill -f "vite" 2>/dev/null && echo "✓ Frontend stopped" || echo "· Frontend not running"

# Postgres container
docker compose down >/dev/null 2>&1 && echo "✓ PostgreSQL stopped" || echo "· Postgres not running"

# Ollama is left running by default. Pass --all to stop it too.
if [ "$1" = "--all" ]; then
  pkill -x ollama 2>/dev/null && echo "✓ Ollama stopped" || echo "· Ollama not running"
else
  echo "· Ollama left running (use ./stop.sh --all to stop it)"
fi

echo "Done."
