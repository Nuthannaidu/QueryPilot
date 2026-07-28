"""
Application-level SQL safety guard.

This is defense-in-depth: the app already connects as a read-only DB user,
but we ALSO refuse to send anything that isn't a single read-only SELECT.
Rejecting early gives a clean error instead of a Postgres permission error,
and blocks expensive/abusive reads too.
"""
import re

# Statement keywords that must never appear.
FORBIDDEN = {
    "insert", "update", "delete", "drop", "truncate", "alter", "create",
    "grant", "revoke", "merge", "call", "copy", "vacuum", "reindex",
    "comment", "attach", "detach", "replace", "lock",
}


class UnsafeQueryError(Exception):
    """Raised when a generated query fails a safety check."""


def _strip_comments(sql: str) -> str:
    """Remove -- line comments and /* */ block comments before analysis."""
    sql = re.sub(r"--[^\n]*", " ", sql)
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    return sql


def sanitize(sql: str) -> str:
    """
    Validate and normalize a generated SQL string.
    Returns cleaned SQL, or raises UnsafeQueryError.
    """
    if not sql or not sql.strip():
        raise UnsafeQueryError("Empty query.")

    cleaned = _strip_comments(sql).strip().rstrip(";").strip()

    # Reject multiple statements (blocks stacked-query injection like
    # "SELECT 1; DROP TABLE ...").
    if ";" in cleaned:
        raise UnsafeQueryError("Multiple SQL statements are not allowed.")

    lowered = cleaned.lower()

    # Must start with SELECT or WITH (CTE that ultimately selects).
    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise UnsafeQueryError("Only SELECT queries are allowed.")

    # Whole-word check for forbidden keywords anywhere in the query.
    words = set(re.findall(r"[a-z_]+", lowered))
    hit = words & FORBIDDEN
    if hit:
        raise UnsafeQueryError(
            f"Query contains forbidden keyword(s): {', '.join(sorted(hit))}."
        )

    return cleaned


def enforce_row_limit(sql: str, max_rows: int) -> str:
    """Append a LIMIT if the query doesn't already have one, capping result size."""
    if re.search(r"\blimit\b", sql, flags=re.IGNORECASE):
        return sql
    return f"{sql}\nLIMIT {max_rows}"
