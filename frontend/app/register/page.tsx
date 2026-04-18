"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getStoredSessionToken, setStoredSession } from "@/src/lib/api";
import { ProjectLogo } from "@/src/components/ProjectLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // If already logged in, skip registration
  useEffect(() => {
    if (getStoredSessionToken()) {
      router.replace("/research");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const result = await api<{
        user: { name: string; email: string };
        session: { token: string };
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });

      setStoredSession(result.session.token, result.user);
      router.push("/research");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed");
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="auth-shell sketch-auth-shell">
          <section className="auth-card glass auth-hero auth-story-card">
            <div className="auth-brand">
              <ProjectLogo className="w-12 h-12" />
              <div>
                <div className="eyebrow">New Workspace</div>
                <strong>ResearchPilot x AskMyNotes</strong>
              </div>
            </div>
            <div>
              <div className="eyebrow">Create Workspace</div>
              <h1 className="auth-title">Set up one account for both research and study flows.</h1>
              <p className="muted">
                This workspace gives you a structured research assistant on one page and the original subject-and-notes study copilot on the other.
              </p>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-dot" />
                <div>
                  <strong>Structured research</strong>
                  <div className="small">Title, abstract, findings, sources, conclusion, and follow-up questions.</div>
                </div>
              </div>
              <div className="status-item">
                <span className="status-dot" />
                <div>
                  <strong>Notes workspace</strong>
                  <div className="small">Three subjects, PDF uploads, note-grounded answers, and practice quiz generation.</div>
                </div>
              </div>
            </div>
            <div className="auth-note-stack">
              <div className="auth-note yellow">Topic expansion and report history</div>
              <div className="auth-note blue">Three subjects and quiz generation</div>
            </div>
          </section>

          <section className="auth-card glass auth-form-card">
            <div className="eyebrow">Registration</div>
            <h1>Create your account</h1>
            <form className="form" onSubmit={handleSubmit}>
              <div>
                <label className="label">Full name</label>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jatin Bisen" />
              </div>

              <div>
                <label className="label">Email</label>
                <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </div>

              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" />
              </div>

              {error ? <div className="error-text">{error}</div> : null}

              <button className="button accent full" type="submit">Create Workspace</button>
            </form>

            <div className="divider" />
            <p className="small muted">
              Already have an account? <Link href="/login"><strong>Sign in here</strong></Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
