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
        <p className="loading-overlay-sub">AskMyNotes × Study Copilot</p>
      </div>
    </div>
  );
}

type StudyTab = "notes" | "chat" | "study";

interface Subject {
  id: string;
  name: string;
  accent: string;
  description: string;
  fileCount: number;
}

interface SubjectFile {
  id: string;
  fileName: string;
  mimeType: string;
  summary: string;
  chunkCount: number;
  pageCount: number | null;
  byteSize: number;
  lastIngestedAt: string | null;
}

interface Citation {
  fileName: string;
  page: number | null;
  chunkId: string;
}

interface AnswerState {
  answer: string;
  confidence: string;
  evidence: string[];
  citations: Citation[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: string;
  evidence?: string[];
  citations?: Citation[];
}

interface QuizState {
  mcqs: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    citation: string;
  }>;
  shortAnswers: Array<{
    id: string;
    question: string;
    modelAnswer: string;
    citation: string;
  }>;
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 KB";
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function createId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StudyPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<StudyTab>("notes");
  const [newSubject, setNewSubject] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState<SubjectFile[]>([]);
  const [chatState, setChatState] = useState<Record<string, ChatMessage[]>>({});
  const [quizState, setQuizState] = useState<Record<string, QuizState | null>>({});
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Working on it...");
  // Read stored user as state post-mount to avoid SSR/hydration mismatch
  const [storedUser, setStoredUser] = useState<{ name: string; email: string } | null>(null);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedId) ?? null,
    [subjects, selectedId]
  );

  const currentMessages = chatState[selectedId] ?? [];
  const currentQuiz = quizState[selectedId] ?? null;

  useEffect(() => {
    if (!getStoredSessionToken()) {
      window.location.href = "/login";
      return;
    }

    // Read user from localStorage after mount
    setStoredUser(getStoredUser());

    Promise.all([
      api<{ user: { name: string; email: string } }>("/api/auth/me"),
      loadSubjects()
    ]).catch((err: unknown) => {
      // Only force logout on a real 401 — not on network errors or backend being down
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("401")) {
        clearStoredSession();
        window.location.href = "/login";
      }
    });
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadFiles(selectedId);
    }
  }, [selectedId]);

  async function loadSubjects() {
    const data = await api<{ subjects: Subject[] }>("/api/subjects");
    setSubjects(data.subjects);
    if (!selectedId && data.subjects[0]) {
      setSelectedId(data.subjects[0].id);
    }
  }

  async function loadFiles(subjectId: string) {
    const data = await api<{ files: SubjectFile[] }>(`/api/subjects/${subjectId}/files`);
    setFiles(data.files);
  }

  async function createSubject() {
    setError("");
    setLoading(true);
    setLoadingLabel("Creating subject...");
    try {
      await api("/api/subjects", {
        method: "POST",
        body: JSON.stringify({
          name: newSubject,
          description: subjectDescription
        })
      });
      setNewSubject("");
      setSubjectDescription("");
      await loadSubjects();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create subject");
    } finally {
      setLoading(false);
    }
  }

  async function uploadNote() {
    if (!selectedId || !selectedFile) return;
    setError("");
    setUploadMessage("");
    setLoading(true);
    setLoadingLabel("Uploading and indexing notes...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const data = await api<{
        ingestion: {
          fileName: string;
          totalPages: number | null;
          chunkCount: number;
          summary: string;
        };
      }>(`/api/subjects/${selectedId}/files`, {
        method: "POST",
        body: formData
      });

      setSelectedFile(null);
      setUploadMessage(`Uploaded ${data.ingestion.fileName}. Extracted ${data.ingestion.chunkCount} chunk(s) and prepared Study Copilot context.`);
      await loadFiles(selectedId);
      await loadSubjects();
      setActiveTab("notes");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to upload file");
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion() {
    if (!selectedId || !question.trim()) return;
    setError("");
    setLoading(true);
    setLoadingLabel("Asking your notes...");

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: question.trim()
    };

    const previousMessages = chatState[selectedId] ?? [];
    const historyPayload = previousMessages.slice(-4).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));

    setChatState((prev) => ({
      ...prev,
      [selectedId]: [...previousMessages, userMessage]
    }));

    try {
      const data = await api<AnswerState & { found: boolean }>("/api/ask", {
        method: "POST",
        body: JSON.stringify({
          subjectId: selectedId,
          question,
          history: historyPayload
        })
      });

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.answer,
        confidence: data.confidence,
        evidence: data.evidence,
        citations: data.citations
      };

      setChatState((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), assistantMessage]
      }));

      setQuestion("");
      setActiveTab("chat");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to ask question");
    } finally {
      setLoading(false);
    }
  }

  async function buildQuiz() {
    if (!selectedId) return;
    setError("");
    setLoading(true);
    setLoadingLabel("Generating quiz questions...");

    try {
      const data = await api<{ quiz: QuizState }>(`/api/subjects/${selectedId}/quiz`, {
        method: "POST"
      });
      setQuizState((prev) => ({
        ...prev,
        [selectedId]: data.quiz
      }));
      setActiveTab("study");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate quiz");
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
              <div className="eyebrow">Study Dashboard</div>
              <div className="brand">AskMyNotes <span>copilot</span></div>
            </div>
          </Link>
          <div className="topbar-status">
            <span className="status-chip">{subjects.length}/3 subjects</span>
            <span className="status-chip">{subjects.reduce((sum, subject) => sum + subject.fileCount, 0)} files</span>
          </div>
          <div className="nav-actions">
            {storedUser ? <span className="small muted">{storedUser.name}</span> : null}
            <Link href="/research" className="button soft">Research Mode</Link>
            <button className="button cream" onClick={handleLogout}>Exit</button>
          </div>
        </nav>

        <div className="study-dashboard-shell study-shell">
          <aside className="study-sidebar">
            <section className="study-sidebar-panel yellow pin-panel">
              <div className="eyebrow">Create Subject</div>
              <h2>Start a new lane</h2>
              <div className="form">
                <input className="input" value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Subject name" />
                <textarea className="textarea compact" value={subjectDescription} onChange={(event) => setSubjectDescription(event.target.value)} placeholder="Short description" />
                <button className="button accent full" disabled={loading || !newSubject.trim()} onClick={createSubject}>
                  Add Subject
                </button>
              </div>
            </section>

            <section className="study-sidebar-panel tape-panel">
              <div className="eyebrow">My Subjects</div>
              <div className="subject-list">
                {subjects.map((subject, index) => (
                  <button
                    key={subject.id}
                    className={`subject-tile ${subject.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(subject.id)}
                  >
                    <div className="subject-tile-head">
                      <div className="subject-badge">{["📘", "📗", "📕"][index % 3]}</div>
                      <div>
                        <strong>{subject.name}</strong>
                        <div className="small muted">{subject.description}</div>
                      </div>
                    </div>
                    <div className="subject-meta-row">
                      <span className="mini-chip">{subject.fileCount} files</span>
                      <span className="mini-chip">{(chatState[subject.id] ?? []).length} chats</span>
                    </div>
                  </button>
                ))}
              </div>
              {subjects.length === 0 ? <p className="muted small">Create a subject to begin uploading notes.</p> : null}
            </section>
          </aside>

          <section className="study-main">
            <div className="study-main-header sketch-hero-panel">
              <div>
                <div className="eyebrow">Current Workspace</div>
                <h1>{selectedSubject?.name ?? "Select a subject"}</h1>
                <p className="muted">
                  {selectedSubject?.description ?? "Choose a subject to upload notes, chat with your material, and generate quizzes."}
                </p>
              </div>
              <div className="pill-row">
                <span className="pill">{files.length} active notes</span>
                <span className="pill">{currentMessages.length} messages</span>
                <span className="pill">{currentQuiz ? "quiz-ready" : "quiz-pending"}</span>
              </div>
            </div>

            <div className="dashboard-tabbar">
              {(["notes", "chat", "study"] as StudyTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`dashboard-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "notes" ? "Notes" : tab === "chat" ? "Chat" : "Study Mode"}
                </button>
              ))}
            </div>

            {activeTab === "notes" ? (
              <div className="dashboard-panel-grid">
                <section className="dashboard-card large yellow-paper">
                  <div className="panel-title">Upload Notes</div>
                  <div className="upload-dropzone">
                    <label className="label">Choose PDF, TXT, or MD</label>
                    <input
                      className="file-input"
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    />
                    <button className="button primary" disabled={loading || !selectedFile || !selectedId} onClick={uploadNote}>
                      Upload and Index
                    </button>
                    {uploadMessage ? <div className="small">{uploadMessage}</div> : null}
                  </div>
                </section>

                <section className="dashboard-card large paper-card">
                  <div className="panel-title">Uploaded Files</div>
                  <div className="notes-file-list">
                    {files.length === 0 ? (
                      <div className="empty-study-state">
                        <div className="big-emoji">📄</div>
                        <strong>No notes uploaded yet</strong>
                        <p className="muted">Once you upload notes, they will appear here with summary, size, and chunking details.</p>
                      </div>
                    ) : files.map((file) => (
                      <article key={file.id} className="notes-file-card">
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <strong>{file.fileName}</strong>
                            <div className="small muted">
                              {file.mimeType} | {file.pageCount ? `${file.pageCount} pages` : "text file"} | {formatSize(file.byteSize)}
                            </div>
                          </div>
                          <span className="mini-chip">{file.chunkCount} chunks</span>
                        </div>
                        <p className="muted">{file.summary}</p>
                        <div className="small">Uploaded: {formatDate(file.lastIngestedAt)}</div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "chat" ? (
              <div className="dashboard-panel-grid chat-layout">
                <section className="dashboard-card yellow-paper">
                  <div className="panel-title">Ask Your Notes</div>
                  <div className="chat-composer">
                    <textarea
                      className="textarea"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Ask a question about the uploaded notes..."
                    />
                    <button className="button primary" disabled={loading || !selectedId || !question.trim()} onClick={askQuestion}>
                      Send Question
                    </button>
                  </div>
                </section>

                <section className="dashboard-card large blueprint-card">
                  <div className="panel-title">Conversation</div>
                  <div className="chat-thread">
                    {currentMessages.length === 0 ? (
                      <div className="empty-study-state">
                        <div className="big-emoji">💭</div>
                        <strong>No questions yet</strong>
                        <p className="muted">Ask anything from the selected subject and Study Copilot will answer with confidence and citations.</p>
                      </div>
                    ) : currentMessages.map((message) => (
                      <article key={message.id} className={`chat-bubble ${message.role}`}>
                        <div className="chat-role">{message.role === "user" ? "You" : "Study Copilot"}</div>
                        <p>{message.content}</p>
                        {message.confidence ? <div className="confidence-pill">{message.confidence} confidence</div> : null}
                        {message.evidence && message.evidence.length > 0 ? (
                          <ul className="clean-list">
                            {message.evidence.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        ) : null}
                        {message.citations && message.citations.length > 0 ? (
                          <div className="citation-list">
                            {message.citations.map((citation) => (
                              <span key={citation.chunkId} className="pill">
                                {citation.fileName} | {citation.chunkId}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "study" ? (
              <div className="dashboard-panel-grid">
                <section className="dashboard-card yellow-paper">
                  <div className="panel-title">Quiz Generator</div>
                  <p className="muted">Build revision questions directly from the currently selected subject.</p>
                  <button className="button accent" disabled={loading || !selectedId} onClick={buildQuiz}>
                    Generate Study Questions
                  </button>
                </section>

                <section className="dashboard-card large paper-card">
                  <div className="panel-title">Quiz Output</div>
                  {currentQuiz ? (
                    <div className="quiz-split">
                      <div className="quiz-block">
                        <strong>Multiple Choice</strong>
                        <ul className="clean-list">
                          {currentQuiz.mcqs.map((item) => (
                            <li key={item.id}>
                              {item.question}
                              <div className="small">Answer: {item.options[item.correctIndex]}</div>
                              <div className="small muted">{item.explanation}</div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="quiz-block">
                        <strong>Short Answer</strong>
                        <ul className="clean-list">
                          {currentQuiz.shortAnswers.map((item) => (
                            <li key={item.id}>
                              {item.question}
                              <div className="small">{item.modelAnswer}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-study-state">
                      <div className="big-emoji">🧠</div>
                      <strong>No study set yet</strong>
                      <p className="muted">Generate a quiz to create MCQs and short-answer prompts from the current subject.</p>
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            {error ? (
              <div className="workspace-card glass">
                <div className="error-text">{error}</div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
