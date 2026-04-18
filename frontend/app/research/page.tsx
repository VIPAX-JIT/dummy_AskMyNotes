"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, clearStoredSession, getStoredSessionToken, getStoredUser } from "@/src/lib/api";
import { ProjectLogo } from "@/src/components/ProjectLogo";

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-card">
        <div className="loading-pencil-track">
          <div className="loading-pencil-track-bar-border" />
          <div className="loading-pencil-track-fill" />
        </div>
        <span className="loading-overlay-label">{label}</span>
        <p className="loading-overlay-sub">ResearchPilot × AskMyNotes</p>
      </div>
    </div>
  );
}

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceType: string;
  credibility: number;
  publishedAt?: string | null;
}

interface ResearchReport {
  title: string;
  abstract: string;
  keyFindings: string[];
  sources: ResearchSource[];
  conclusion: string;
  followUpQuestions: string[];
  generatedAt: string;
}

interface ResearchResponse {
  sessionId: string;
  report: ResearchReport;
  workflow: {
    searchQuery: string;
    sourcesAnalyzed: number;
    warnings: string[];
    usedSessionMemory: boolean;
    modelUsed: string | null;
    stages: string[];
  };
}

interface TopicExpansion {
  expansions: string[];
  subtopics: string[];
  suggestedQuestions: string[];
}

interface HistoryItem {
  query: string;
  title: string;
  abstract: string;
  generatedAt: string;
  sessionId: string;
  sourceCount: number;
  warnings: string[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState(`research_${Date.now()}`);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [expansion, setExpansion] = useState<TopicExpansion | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Working on it...");
  // Read stored user as state after mount to avoid SSR/hydration mismatch
  const [storedUser, setStoredUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!getStoredSessionToken()) {
      window.location.href = "/login";
      return;
    }

    // Set user from localStorage immediately after mount
    setStoredUser(getStoredUser());

    Promise.all([
      api<{ user: { name: string; email: string } }>("/api/auth/me"),
      api<{ history: HistoryItem[] }>("/api/research/history")
    ])
      .then(([, historyData]) => setHistory(historyData.history))
      .catch((err: unknown) => {
        // Only force logout on a real 401 — not on network errors or backend being down
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("401")) {
          clearStoredSession();
          window.location.href = "/login";
        }
      });
  }, []);

  const prompts = useMemo(() => [
    "Recent applications of graph neural networks in healthcare diagnostics",
    "How retrieval-augmented generation reduces hallucinations in research assistants",
    "Sustainable aviation fuel adoption barriers in developing economies",
    "Benchmarking multimodal large language models for document reasoning"
  ], []);

  async function refreshHistory() {
    const historyData = await api<{ history: HistoryItem[] }>("/api/research/history");
    setHistory(historyData.history);
  }


  async function handleGenerate(event: React.FormEvent) {

    event.preventDefault();
    setLoading(true);
    setLoadingLabel("Generating research report...");
    setError("");

    try {
      const data = await api<ResearchResponse>("/api/research/report", {
        method: "POST",
        body: JSON.stringify({ query, sessionId })
      });
      setResult(data);
      setSessionId(data.sessionId);
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    setLoading(true);
    setLoadingLabel("Expanding topic...");
    setError("");

    try {
      const data = await api<TopicExpansion & { query: string }>("/api/research/expand", {
        method: "POST",
        body: JSON.stringify({ query, sessionId })
      });
      setExpansion({
        expansions: data.expansions,
        subtopics: data.subtopics,
        suggestedQuestions: data.suggestedQuestions
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to expand topic");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear locally either way.
    }
    clearStoredSession();
    window.location.href = "/";
  }

  function exportMarkdown() {
    if (!result) return;

    const markdown = [
      `# ${result.report.title}`,
      "",
      "## Abstract",
      result.report.abstract,
      "",
      "## Key Findings",
      ...result.report.keyFindings.map((entry) => `- ${entry}`),
      "",
      "## Sources",
      ...result.report.sources.map((source) => `- [${source.title}](${source.url})`),
      "",
      "## Conclusion",
      result.report.conclusion,
      "",
      "## Follow-Up Questions",
      ...result.report.followUpQuestions.map((item) => `- ${item}`)
    ].join("\n");

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "research-report.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      {loading && <LoadingOverlay label={loadingLabel} />}
      <div className="container">
        <nav className="sketch-topbar">
          <Link href="/" className="brand-lockup">
            <div className="brand-mark">
              <ProjectLogo className="w-11 h-11" />
            </div>
            <div>
              <div className="eyebrow">Research Dashboard</div>
              <div className="brand">ResearchPilot <span>workspace</span></div>
            </div>
          </Link>
          <div className="topbar-status">
            <span className="status-chip">{history.length} reports</span>
            <span className="status-chip">{result?.workflow.sourcesAnalyzed ?? 0} sources</span>
          </div>
          <div className="nav-actions">
            {storedUser ? <span className="small muted">{storedUser.name}</span> : null}
            <Link href="/study" className="button soft">Study Copilot</Link>
            <button className="button cream" onClick={handleLogout}>Exit</button>
          </div>
        </nav>

        <div className="study-dashboard-shell research-shell">
          <aside className="study-sidebar">
            <section className="study-sidebar-panel blue pin-panel">
              <div className="eyebrow">Research Query</div>
              <h2>Frame the topic</h2>
              <form className="form" onSubmit={handleGenerate}>
                <textarea
                  className="textarea"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ask an open-ended research question"
                />
                <button className="button primary full" type="submit" disabled={loading}>
                  Generate Report
                </button>
                <button className="button accent full" type="button" disabled={loading || !query.trim()} onClick={handleExpand}>
                  Expand Topic
                </button>
              </form>
              {error ? <div className="error-text" style={{ marginTop: 12 }}>{error}</div> : null}
            </section>

            <section className="study-sidebar-panel prompt-stack-panel">
              <div className="eyebrow">Prompt Starters</div>
              <div className="stack">
                {prompts.map((prompt) => (
                  <button key={prompt} className="subject-tile compact" onClick={() => setQuery(prompt)}>
                    <strong>{prompt}</strong>
                  </button>
                ))}
              </div>
            </section>

            {expansion ? (
              <section className="study-sidebar-panel tape-panel">
                <div className="eyebrow">Topic Expansion</div>
                <div className="stack">
                  <div>
                    <strong>Broader angles</strong>
                    <div className="citation-list" style={{ marginTop: 10 }}>
                      {expansion.expansions.map((item) => <span key={item} className="pill">{item}</span>)}
                    </div>
                  </div>
                  <div>
                    <strong>Subtopics</strong>
                    <div className="citation-list" style={{ marginTop: 10 }}>
                      {expansion.subtopics.map((item) => <span key={item} className="pill">{item}</span>)}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </aside>

          <section className="study-main">
            <div className="study-main-header sketch-hero-panel">
              <div>
                <div className="eyebrow">Structured Report</div>
                <h1>{result?.report.title ?? "Generate a report"}</h1>
                <p className="muted">
                  {result
                    ? `Generated ${formatDate(result.report.generatedAt)} using ${result.workflow.modelUsed ?? "local fallback"}`
                    : "Use the left panel to generate a source-backed research brief with structured output."}
                </p>
              </div>
              <div className="pill-row">
                {result ? <span className="pill">{result.workflow.sourcesAnalyzed} sources analyzed</span> : null}
                {result?.workflow.usedSessionMemory ? <span className="pill">session memory</span> : null}
                <button className="button cream" onClick={exportMarkdown} disabled={!result}>Export Markdown</button>
              </div>
            </div>

            {result ? (
              <div className="stack research-stack">
                <div className="dashboard-panel-grid compact">
                  <section className="dashboard-card paper-card">
                    <div className="panel-title">Abstract</div>
                    <p className="muted">{result.report.abstract}</p>
                  </section>
                  <section className="dashboard-card blueprint-card">
                    <div className="panel-title">Workflow</div>
                    <div className="citation-list">
                      {result.workflow.stages.map((stage) => <span key={stage} className="pill">{stage}</span>)}
                    </div>
                    {result.workflow.warnings.length > 0 ? (
                      <ul className="clean-list" style={{ marginTop: 12 }}>
                        {result.workflow.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    ) : (
                      <p className="muted" style={{ marginTop: 12 }}>No workflow warnings were returned for this report.</p>
                    )}
                  </section>
                </div>

                <section className="dashboard-card yellow-paper">
                  <div className="panel-title">Key Findings</div>
                  <ul className="clean-list">
                    {result.report.keyFindings.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>

                <div className="dashboard-panel-grid compact">
                  <section className="dashboard-card paper-card">
                    <div className="panel-title">Sources</div>
                    <div className="notes-file-list">
                      {result.report.sources.map((source) => (
                        <article key={source.url} className="notes-file-card">
                          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <strong>{source.title}</strong>
                              <div className="small muted">{source.domain} | {source.sourceType}</div>
                            </div>
                            <span className="mini-chip">{Math.round(source.credibility * 100)}%</span>
                          </div>
                          <p className="muted">{source.snippet}</p>
                          <a href={source.url} target="_blank" rel="noreferrer"><strong>Open source</strong></a>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="dashboard-card blueprint-card">
                    <div className="panel-title">Conclusion</div>
                    <p className="muted">{result.report.conclusion}</p>
                    <div className="panel-title" style={{ marginTop: 20 }}>Follow-Up Questions</div>
                    <div className="citation-list">
                      {result.report.followUpQuestions.map((item) => <span key={item} className="pill">{item}</span>)}
                    </div>
                  </section>
                </div>

                <section className="dashboard-card paper-card">
                  <div className="panel-title">Session History</div>
                  <div className="notes-file-list">
                    {history.map((entry) => (
                      <article key={`${entry.sessionId}-${entry.generatedAt}`} className="notes-file-card">
                        <strong>{entry.title}</strong>
                        <p className="muted">{entry.abstract}</p>
                        <div className="small">Sources: {entry.sourceCount} | {formatDate(entry.generatedAt)}</div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="empty-study-state research-empty">
                <div className="big-emoji">🔎</div>
                <strong>No report yet</strong>
                <p className="muted">Generate a report to see research synthesis, workflow stages, sources, conclusion, follow-up questions, and session history in this workspace.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
