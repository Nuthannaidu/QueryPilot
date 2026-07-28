"""Database access: schema introspection + read-only query execution."""
from decimal import Decimal
from datetime import date, datetime

import psycopg

from config import DATABASE_URL


def get_schema_description() -> str:
    """
    Introspect the live database and return a compact text description
    of every table and column. This is fed to the LLM so it generates
    SQL against the REAL schema instead of guessing table/column names.
    """
    query = """
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """
    tables: dict[str, list[str]] = {}
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            for table, column, dtype in cur.fetchall():
                tables.setdefault(table, []).append(f"{column} {dtype}")

    lines = []
    for table, cols in tables.items():
        cols_str = ", ".join(cols)
        lines.append(f"{table}({cols_str})")
    return "\n".join(lines)


def _jsonable(value):
    """Convert Postgres types that aren't JSON-serializable by default."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def run_query(sql: str) -> tuple[list[str], list[list]]:
    """
    Execute a read-only query. Runs inside a read-only transaction as an
    extra guard. Returns (column_names, rows).
    Raises psycopg errors on invalid SQL — the caller uses those to
    drive the self-correcting retry loop.
    """
    with psycopg.connect(DATABASE_URL) as conn:
        conn.read_only = True
        with conn.cursor() as cur:
            cur.execute(sql)
            columns = [desc.name for desc in cur.description]
            rows = [[_jsonable(v) for v in row] for row in cur.fetchall()]
    return columns, rows
