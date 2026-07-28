import { useEffect, useMemo, useState } from "react";

const EXAMPLES = [
  "Find employees earning more than the average salary",
  "Which department has the highest total salary?",
  "List employees hired in 2022 with their department name",
  "Show the top 3 highest paid employees and their managers",
  "How many active projects does each department have?",
];

/* ---- small presentational helpers ------------------------------------ */

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
        stroke="url(#g)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 2v20M3 7l9 5 9-5" stroke="url(#g)" strokeWidth="1.6" strokeLinejoin="round" />
      <defs>
        <linearGradient id="g" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c9cff" />
          <stop offset="1" stopColor="#5be0c9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

/* Parse the compact schema string from the API into structured tables. */
function parseSchema(schema) {
  return schema
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\w+)\((.*)\)$/);
      if (!m) return null;
      const cols = m[2].split(",").map((c) => c.trim());
      return { table: m[1], cols };
    })
    .filter(Boolean);
}

/* ---- main app --------------------------------------------------------- */

export default function App() {
  const [question, setQuestion] = useState("");
  const [schema, setSchema] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("results");

  useEffect(() => {
    fetch("/api/schema")
      .then((r) => r.json())
      .then((d) => setSchema(d.schema))
      .catch(() => {});
  }, []);

  const tables = useMemo(() => parseSchema(schema), [schema]);

  async function run(q) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();
      setResult(data);
      setTab(data.rows?.length ? "results" : "sql");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const failedAttempts = result?.attempts?.filter((a) => a.error) ?? [];

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <div className="brand-name">QueryPilot</div>
            <div className="brand-tag">AI SQL Generator</div>
          </div>
        </div>

        <div className="side-section">
          <div className="side-title">Database</div>
          <div className="db-pill">
            <span className="dot" /> company · PostgreSQL
          </div>
        </div>

        <div className="side-section">
          <div className="side-title">Tables</div>
          {tables.length === 0 && <div className="muted small">Loading schema…</div>}
          {tables.map((t) => (
            <details key={t.table} className="table-item">
              <summary>
                <span className="tbl-name">{t.table}</span>
                <span className="tbl-count">{t.cols.length}</span>
              </summary>
              <ul>
                {t.cols.map((c) => {
                  const [name, ...type] = c.split(" ");
                  return (
                    <li key={c}>
                      <span className="col-name">{name}</span>
                      <span className="col-type">{type.join(" ")}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>

        <div className="side-footer">
          <span className="badge">🔒 Read-only</span>
          <span className="badge">🧠 Local LLM</span>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div>
            <h1>Ask your database anything</h1>
            <p className="sub">
              Plain English → validated PostgreSQL → real results & explanation.
            </p>
          </div>
          <a
            className="gh-link"
            href="https://github.com/Nuthannaidu/QueryPilot"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub ↗
          </a>
        </header>

        <div className="ask-card">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(question);
            }}
            rows={2}
            disabled={loading}
            placeholder="e.g. Find employees earning more than the average salary"
          />
          <div className="ask-actions">
            <span className="hint">⌘/Ctrl + Enter to run</span>
            <button className="run-btn" onClick={() => run(question)} disabled={loading || !question.trim()}>
              {loading ? "Generating…" : "Generate & Run"}
            </button>
          </div>
        </div>

        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="chip"
              disabled={loading}
              onClick={() => { setQuestion(ex); run(ex); }}
            >
              {ex}
            </button>
          ))}
        </div>

        {error && <div className="error">⚠️ {error}</div>}

        {loading && (
          <div className="loading-card">
            <div className="spinner" />
            <div>
              <div className="load-title">Thinking through your question…</div>
              <div className="muted small">Reading schema → writing SQL → running it</div>
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="empty">
            <div className="empty-icon">💬</div>
            <p>Type a question above or pick an example to get started.</p>
          </div>
        )}

        {result && !loading && (
          <div className="result-card">
            {failedAttempts.length > 0 && (
              <div className="selfcorrect">
                <strong>🔁 Self-corrected</strong> after {failedAttempts.length} failed
                attempt{failedAttempts.length > 1 ? "s" : ""}:
                <ul>
                  {failedAttempts.map((a, i) => (
                    <li key={i}><code>{a.error}</code></li>
                  ))}
                </ul>
              </div>
            )}

            {result.data_summary && (
              <div className="answer">
                <div className="answer-label">Answer</div>
                <p>{result.data_summary}</p>
              </div>
            )}

            <div className="tabs">
              <button className={tab === "results" ? "tab active" : "tab"} onClick={() => setTab("results")}>
                Results {result.rows?.length ? `(${result.rows.length})` : ""}
              </button>
              <button className={tab === "sql" ? "tab active" : "tab"} onClick={() => setTab("sql")}>
                SQL
              </button>
              <button className={tab === "explain" ? "tab active" : "tab"} onClick={() => setTab("explain")}>
                Explanation
              </button>
            </div>

            {tab === "results" && (
              <div className="tab-body">
                {result.columns?.length ? (
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => <td key={j}>{String(cell ?? "")}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">No rows returned.</p>
                )}
              </div>
            )}

            {tab === "sql" && (
              <div className="tab-body">
                <div className="sql-head">
                  <span className="muted small">Generated PostgreSQL</span>
                  <CopyButton text={result.sql} />
                </div>
                <pre className="sql">{result.sql}</pre>
              </div>
            )}

            {tab === "explain" && (
              <div className="tab-body">
                <p>{result.explanation || "No explanation available."}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
