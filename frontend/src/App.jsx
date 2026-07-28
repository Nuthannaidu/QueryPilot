import { useEffect, useState } from "react";

const EXAMPLES = [
  "Find employees earning more than the average salary",
  "Which department has the highest total salary?",
  "List employees hired in 2022 with their department name",
  "Show the top 3 highest paid employees and their managers",
  "How many active projects does each department have?",
];

export default function App() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [schema, setSchema] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/schema")
      .then((r) => r.json())
      .then((d) => setSchema(d.schema))
      .catch(() => {});
  }, []);

  async function run(q) {
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
      setResult(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const failedAttempts = result?.attempts?.filter((a) => a.error) ?? [];

  return (
    <div className="page">
      <header>
        <h1>AI SQL Query Generator</h1>
        <p className="sub">
          Ask in plain English. Runs on a local LLM against a read-only
          PostgreSQL database, with a self-correcting retry loop.
        </p>
      </header>

      <div className="ask">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="e.g. Find employees earning more than the average salary"
        />
        <button onClick={() => run(question)} disabled={loading || !question.trim()}>
          {loading ? "Thinking…" : "Generate & Run"}
        </button>
      </div>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="chip" onClick={() => { setQuestion(ex); run(ex); }}>
            {ex}
          </button>
        ))}
      </div>

      {schema && (
        <details className="schema">
          <summary>Database schema</summary>
          <pre>{schema}</pre>
        </details>
      )}

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="result">
          {failedAttempts.length > 0 && (
            <div className="selfcorrect">
              🔁 Self-corrected after {failedAttempts.length} failed attempt
              {failedAttempts.length > 1 ? "s" : ""}:
              <ul>
                {failedAttempts.map((a, i) => (
                  <li key={i}><code>{a.error}</code></li>
                ))}
              </ul>
            </div>
          )}

          <section>
            <h2>Generated SQL</h2>
            <pre className="sql">{result.sql}</pre>
          </section>

          {result.explanation && (
            <section>
              <h2>What it does</h2>
              <p>{result.explanation}</p>
            </section>
          )}

          {result.data_summary && (
            <section>
              <h2>Summary of results</h2>
              <p>{result.data_summary}</p>
            </section>
          )}

          {result.columns.length > 0 && (
            <section>
              <h2>Results ({result.rows.length} rows)</h2>
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
