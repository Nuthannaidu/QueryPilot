# QueryPilot — AI SQL Query Generator

Ask a question in plain English → QueryPilot writes a PostgreSQL query, runs it
against a real database, and shows you the results **plus** a plain-English
explanation.

It runs **entirely on your own machine** using a **free, local AI model**
(Ollama) — no API keys, no cloud, no cost.

> **Example**
> **You type:** *"Find employees earning more than the average salary"*
> **QueryPilot returns:**
> ```sql
> SELECT name FROM employees
> WHERE salary > (SELECT AVG(salary) FROM employees)
> ```
> …runs it, shows the 6 matching employees in a table, and explains:
> *"This query selects employees whose salary is greater than the company-wide average."*

---

## Table of contents
1. [What problem it solves](#1-what-problem-it-solves)
2. [Tech stack (and why each piece)](#2-tech-stack-and-why-each-piece)
3. [How it works — the full workflow](#3-how-it-works--the-full-workflow)
4. [The three key features explained](#4-the-three-key-features-explained)
5. [Project structure — what every file does](#5-project-structure--what-every-file-does)
6. [How to run it](#6-how-to-run-it)
7. [Example questions to try](#7-example-questions-to-try)

---

## 1. What problem it solves

Not everyone knows SQL, but a lot of useful information lives inside SQL
databases. QueryPilot lets **anyone ask questions in plain English** and get
real answers from the database — while a normal person would need to know how
to write `JOIN`s, `GROUP BY`, subqueries, etc.

The tricky part isn't calling an AI model — that's easy. The hard (and
interesting) parts are:
- Making the AI generate SQL that is **valid for your actual database**.
- **Recovering automatically** when the AI makes a mistake.
- Making it **safe** so a generated query can never damage your data.

QueryPilot solves all three. That's what makes it more than a "thin wrapper"
around an AI model.

---

## 2. Tech stack (and why each piece)

| Layer | Technology | Why we chose it |
|-------|-----------|-----------------|
| **Frontend** | **React** (with **Vite**) | The most popular UI library — great for a resume. Vite makes it start up instantly. This is the web page you type your question into. |
| **Backend** | **Python + FastAPI** | FastAPI is a modern, fast Python web framework. It's the "brain" — it talks to the AI model and the database. Python is the standard language for AI work. |
| **AI model** | **Ollama** running **qwen2.5-coder:7b** | Ollama runs AI models **locally and for free** (no OpenAI bill). `qwen2.5-coder` is a model that's specifically good at writing code and SQL. |
| **Database** | **PostgreSQL** (inside **Docker**) | Postgres is a professional, industry-standard database. Docker lets us run it in one command without installing Postgres directly on the computer. |
| **Glue** | **httpx** (calls Ollama), **psycopg** (calls Postgres) | Python libraries the backend uses to talk to the AI model and the database. |

**In one sentence:** React (what you see) → FastAPI (the logic) → Ollama (writes
SQL) + PostgreSQL (runs SQL).

---

## 3. How it works — the full workflow

Here is exactly what happens, step by step, when you ask a question:

```
   YOU (browser)
      │  1. Type: "Find employees earning more than the average salary"
      ▼
   REACT FRONTEND
      │  2. Sends the question to the backend  (POST /api/query)
      ▼
   FASTAPI BACKEND
      │  3. Reads the LIVE database schema (table & column names)
      │  4. Sends "schema + your question" to the AI model
      ▼
   OLLAMA (local AI)
      │  5. Writes a SQL query and sends it back
      ▼
   FASTAPI BACKEND
      │  6. SAFETY CHECK — is it a read-only SELECT? (reject DROP/DELETE/etc.)
      │  7. Runs the query on the database
      │        │
      │        ├─ If it ERRORS → send the error back to the AI, ask for a fix,
      │        │                 and try again  (the "self-correcting loop")
      │        │
      │        └─ If it WORKS → keep the results
      │  8. Asks the AI to explain the query + summarize the results
      ▼
   REACT FRONTEND
      │  9. Shows: the SQL, the result table, the explanation, and the summary
      ▼
   YOU  ✅
```

**Why step 3 matters (schema-aware):** we don't just hope the AI guesses the
right table names. We *read the real database* and tell the AI exactly what
tables and columns exist. This is why it generates correct queries instead of
made-up ones.

---

## 4. The three key features explained

### 🧠 Feature 1 — Schema-aware generation
Before asking the AI for SQL, the backend inspects the live database and builds
a description like:
```
employees(id, name, email, department_id, manager_id, salary, hired_at)
departments(id, name, location)
projects(id, name, department_id, budget, started_at, status)
```
This is sent to the AI along with your question, so the AI writes SQL for *your*
real tables — not generic guesses.
*(Code: `backend/db.py → get_schema_description()`)*

### 🔁 Feature 2 — Self-correcting loop
AI models sometimes write SQL that has a small mistake (wrong column name, etc.).
Instead of just failing, QueryPilot:
1. Runs the query.
2. If the database returns an error, it sends **that exact error back to the AI**
   and says *"this failed with this error — fix it."*
3. Tries again (up to 3 times by default).

The web page even shows you what failed and how it recovered. This mimics how a
real developer debugs.
*(Code: `backend/main.py → query()` loop, and `backend/llm.py → fix_sql()`)*

### 🛡️ Feature 3 — Three-layer safety
An AI writing SQL that we then *run* could be dangerous (imagine it writes
`DROP TABLE`). QueryPilot has three independent safety layers:

1. **Read-only database user** — the app logs into Postgres as a user that
   physically *cannot* modify data. Even a destructive query is rejected by the
   database itself. *(Code: `db/init/03_readonly_user.sql`)*
2. **Application filter** — before running anything, we check it's a single
   `SELECT`. Anything with `DROP`, `DELETE`, `UPDATE`, or multiple statements is
   blocked. *(Code: `backend/safety.py`)*
3. **Row limit** — every query gets a `LIMIT` so it can't return millions of
   rows and freeze the app. *(Code: `backend/safety.py → enforce_row_limit()`)*

This is called **"defense-in-depth"** — if one layer somehow fails, the others
still protect you.

---

## 5. Project structure — what every file does

```
QueryPilot/
│
├── start.sh                 # Starts EVERYTHING with one command
├── stop.sh                  # Stops everything
├── docker-compose.yml       # Defines the PostgreSQL database container
│
├── db/init/                 # These run automatically when the DB is first created
│   ├── 01_schema.sql        #  → creates the tables (employees, departments, ...)
│   ├── 02_seed.sql          #  → fills them with sample data
│   └── 03_readonly_user.sql #  → creates the safe read-only login
│
├── backend/                 # The Python "brain" (FastAPI)
│   ├── main.py              #  → the web API + the self-correcting workflow
│   ├── llm.py               #  → talks to the Ollama AI model
│   ├── db.py                #  → reads the schema + runs queries on Postgres
│   ├── safety.py            #  → blocks dangerous SQL
│   ├── config.py            #  → settings (model name, DB address, limits)
│   ├── requirements.txt     #  → Python libraries to install
│   └── .env.example         #  → sample configuration file
│
└── frontend/                # The React web page
    ├── src/App.jsx          #  → the whole user interface (input, results, table)
    ├── src/styles.css       #  → the styling / look
    ├── src/main.jsx         #  → React entry point
    └── vite.config.js       #  → dev server config (also forwards /api to backend)
```

**If you want to read the code, start here, in this order:**
1. `backend/main.py` — the overall flow (this is the heart of the project).
2. `backend/llm.py` — how we ask the AI to write and fix SQL.
3. `backend/safety.py` — how we keep it safe.
4. `frontend/src/App.jsx` — how the page talks to the backend.

---

## 6. How to run it

### Prerequisites (install these once)
- [Docker](https://www.docker.com/products/docker-desktop/) — runs PostgreSQL
- [Ollama](https://ollama.com/) — runs the AI model (`brew install ollama` on Mac)
- Python 3.11+
- Node.js 18+

### Easiest way — one command
```bash
cd QueryPilot
./start.sh          # starts DB, AI, backend, and frontend
```
Then open **http://localhost:5173** in your browser.

To stop everything:
```bash
./stop.sh
```

### Manual way (if you want to understand each part)
```bash
# 1. Start the database
docker compose up -d

# 2. Start the AI model
ollama serve &
ollama pull qwen2.5-coder:7b

# 3. Start the backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# 4. Start the frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

---

## 7. Example questions to try

- Find employees earning more than the average salary
- Which department has the highest total salary?
- List employees hired in 2022 with their department name
- Show the top 3 highest paid employees and their managers
- How many active projects does each department have?
- Who are the managers and how many people report to each of them?

---

*Built as a full-stack AI portfolio project: React + FastAPI + PostgreSQL + a
local LLM, with schema-aware generation, a self-correcting retry loop, and
read-only safety guardrails.*
