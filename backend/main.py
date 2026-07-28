"""
FastAPI app: natural language -> SQL -> results + explanation.

Core flow (POST /api/query):
  1. Introspect the live DB schema.
  2. Ask the LLM for a SELECT query given the schema + question.
  3. Safety-check the query (SELECT-only, single statement, row limit).
  4. Execute it. If Postgres errors, feed the error back to the LLM and
     retry (the self-correcting loop) up to MAX_SQL_RETRIES times.
  5. Return the SQL, results, an explanation of the query, and a summary
     of the actual data.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
import llm
import safety
from config import MAX_SQL_RETRIES, MAX_ROWS

app = FastAPI(title="AI SQL Query Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


class Attempt(BaseModel):
    sql: str
    error: str | None = None


class QueryResponse(BaseModel):
    question: str
    sql: str
    columns: list[str]
    rows: list[list]
    explanation: str
    data_summary: str
    attempts: list[Attempt]  # full trail, so the UI can show self-correction


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/schema")
def schema():
    """Expose the schema so the frontend can show users what they can ask about."""
    return {"schema": db.get_schema_description()}


@app.post("/api/query", response_model=QueryResponse)
def query(req: QueryRequest):
    schema_desc = db.get_schema_description()
    attempts: list[Attempt] = []

    # First pass.
    raw_sql = llm.generate_sql(req.question, schema_desc)

    last_error = None
    for attempt_num in range(MAX_SQL_RETRIES + 1):
        try:
            safe_sql = safety.sanitize(raw_sql)
            safe_sql = safety.enforce_row_limit(safe_sql, MAX_ROWS)
            columns, rows = db.run_query(safe_sql)
            attempts.append(Attempt(sql=safe_sql, error=None))

            explanation = llm.explain_sql(req.question, safe_sql)
            data_summary = (
                llm.explain_results(req.question, columns, rows)
                if rows else "The query ran successfully but returned no rows."
            )
            return QueryResponse(
                question=req.question,
                sql=safe_sql,
                columns=columns,
                rows=rows,
                explanation=explanation,
                data_summary=data_summary,
                attempts=attempts,
            )
        except (safety.UnsafeQueryError, Exception) as exc:  # noqa: BLE001
            last_error = str(exc)
            attempts.append(Attempt(sql=raw_sql, error=last_error))
            if attempt_num == MAX_SQL_RETRIES:
                break
            # Self-correct: hand the error back to the model.
            raw_sql = llm.fix_sql(req.question, schema_desc, raw_sql, last_error)

    # All attempts exhausted.
    return QueryResponse(
        question=req.question,
        sql=attempts[-1].sql if attempts else "",
        columns=[],
        rows=[],
        explanation="",
        data_summary=f"Could not produce a working query after "
                     f"{MAX_SQL_RETRIES + 1} attempts. Last error: {last_error}",
        attempts=attempts,
    )
