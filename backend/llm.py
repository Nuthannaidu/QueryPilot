"""Ollama integration: generate SQL from a question, and explain results."""
import json
import re

import httpx

from config import OLLAMA_URL, OLLAMA_MODEL


def _call_ollama(prompt: str, system: str = "") -> str:
    """Single non-streaming completion call to Ollama."""
    resp = httpx.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {"temperature": 0.1},
        },
        timeout=120.0,
    )
    resp.raise_for_status()
    return resp.json()["response"].strip()


def _extract_sql(text: str) -> str:
    """Pull SQL out of a model response that may be wrapped in ``` fences."""
    fenced = re.search(r"```(?:sql)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1).strip()
    return text.strip()


SQL_SYSTEM = (
    "You are an expert PostgreSQL analyst. Given a database schema and a "
    "question, respond with ONLY a single valid PostgreSQL SELECT query that "
    "answers it. No prose, no explanation, no markdown fences. Never write "
    "INSERT, UPDATE, DELETE, DROP or any statement that modifies data."
)


def generate_sql(question: str, schema: str) -> str:
    """First-pass SQL generation from a natural-language question."""
    prompt = (
        f"Database schema:\n{schema}\n\n"
        f"Question: {question}\n\n"
        f"PostgreSQL query:"
    )
    return _extract_sql(_call_ollama(prompt, system=SQL_SYSTEM))


def fix_sql(question: str, schema: str, bad_sql: str, error: str) -> str:
    """
    Self-correcting step: the previous query errored. Give the model the
    failing SQL and the exact database error, and ask for a corrected query.
    """
    prompt = (
        f"Database schema:\n{schema}\n\n"
        f"Question: {question}\n\n"
        f"This PostgreSQL query failed:\n{bad_sql}\n\n"
        f"The database returned this error:\n{error}\n\n"
        f"Return a corrected PostgreSQL SELECT query. Output ONLY the SQL."
    )
    return _extract_sql(_call_ollama(prompt, system=SQL_SYSTEM))


def explain_sql(question: str, sql: str) -> str:
    """Plain-English explanation of what the query does."""
    prompt = (
        f"Question the user asked: {question}\n\n"
        f"SQL query that answers it:\n{sql}\n\n"
        f"Explain in 2-3 short sentences, in plain English, what this query "
        f"does and how it answers the question. Do not repeat the SQL."
    )
    return _call_ollama(prompt)


def explain_results(question: str, columns: list[str], rows: list[list]) -> str:
    """Summarize the actual result data in plain English (the 'AI analyst' bit)."""
    preview = [columns] + rows[:15]
    prompt = (
        f"Question: {question}\n\n"
        f"Query results (first rows as JSON):\n{json.dumps(preview)}\n\n"
        f"In 1-2 sentences, summarize what these results tell us. "
        f"Be specific with numbers where relevant."
    )
    return _call_ollama(prompt)
