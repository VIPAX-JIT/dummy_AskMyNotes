"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getStoredSessionToken, setStoredSession } from "@/src/lib/api";
import { ProjectLogo } from "@/src/components/ProjectLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // If already logged in, skip the login page entirely
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
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      setStoredSession(result.session.token, result.user);
      router.push("/research");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed");
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
                <div className="eyebrow">Workspace Access</div>
                <strong>ResearchPilot x AskMyNotes</strong>
              </div>
            </div>
            <div>
              <div className="eyebrow">Sign In</div>
              <h1 className="auth-title">Return to your research and study workspace.</h1>
              <p className="muted">
                Jump back into structured reports, topic expansion, uploaded notes, and quiz generation
                from the same account.
              </p>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-dot" />
                <div>
                  <strong>Research mode</strong>
                  <div className="small">Generate source-backed briefs and continue session history.</div>
                </div>
              </div>
              <div className="status-item">
                <span className="status-dot" />
                <div>
                  <strong>Study mode</strong>
                  <div className="small">Keep up to three subjects with uploads, grounded answers, and revision quizzes.</div>
                </div>
              </div>
            </div>
            <div className="auth-note-stack">
              <div className="auth-note yellow">Source-backed research reports</div>
              <div className="auth-note blue">Subject uploads and grounded answers</div>
            </div>
          </section>

          <section className="auth-card glass auth-form-card">
            <div className="eyebrow">Account Access</div>
            <h1>Welcome back</h1>
            <form className="form" onSubmit={handleSubmit}>
              <div>
                <label className="label">Email</label>
                <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </div>

              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
              </div>

              {error ? <div className="error-text">{error}</div> : null}

              <button className="button primary full" type="submit">Continue to Workspace</button>
            </form>

            <div className="divider" />
            <p className="small muted">
              Need a new account? <Link href="/register"><strong>Create one here</strong></Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
