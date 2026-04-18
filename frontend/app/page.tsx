"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, clearStoredSession, getStoredSessionToken, getStoredUser } from "@/src/lib/api";
import { ProjectLogo } from "@/src/components/ProjectLogo";

function FeatureCard({
  title,
  body,
  badge,
  tone
}: {
  title: string;
  body: string;
  badge: string;
  tone: "yellow" | "blue" | "rose";
}) {
  return (
    <article className={`sketch-card ${tone}`}>
      <div className="card-badge">{badge}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

export default function HomePage() {
  // null = not yet determined (SSR / first render), string = logged-in name, false = logged out
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getStoredSessionToken();

    if (token && storedUser) {
      setUser(storedUser);
      // Silently validate the token is still alive; if expired/invalid, clear it
      api<{ user: { name: string; email: string } }>("/api/auth/me").catch(() => {
        clearStoredSession();
        setUser(null);
      });
    }

    setHydrated(true);
  }, []);

  function handleLogout() {
    api("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearStoredSession();
    setUser(null);
  }

  return (
    <main className="landing-shell">
      <div className="graph-paper" />
      <div className="landing-container">
        <nav className="landing-nav">
          <Link href="/" className="landing-brand">
            <ProjectLogo className="w-10 h-10" />
            <span>ResearchPilot x AskMyNotes</span>
          </Link>

          {/* Render nothing until after hydration to avoid SSR/localStorage flash */}
          {hydrated && (
            <div className="landing-nav-actions">
              {user ? (
                <>
                  <span className="landing-user-chip">👋 {user.name}</span>
                  <Link href="/research" className="sketch-btn primary">Go to Workspace</Link>
                  <button className="sketch-btn secondary" onClick={handleLogout}>Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="sketch-btn secondary">Sign In</Link>
                  <Link href="/register" className="sketch-btn primary">Open Workspace</Link>
                </>
              )}
            </div>
          )}
        </nav>

        <section className="landing-hero">
          <div className="hero-copy-block">
            <div className="hero-kicker">Agentic research assistant + study copilot</div>
            <h1 className="landing-title">
Turn your messy notes into a workspace that truly helps you think clearly.
            </h1>
            <p className="landing-copy">
              ResearchPilot builds structured briefs with sources, findings, expansion, and report history.
              AskMyNotes keeps your study flow alive with subjects, file uploads, grounded answers, and quiz generation.
            </p>
            <div className="hero-actions">
              <Link href="/research" className="sketch-btn primary">Launch Research Mode</Link>
              <Link href="/study" className="sketch-btn blue">Open Study Copilot</Link>
            </div>
            <div className="hero-meta">
              <span>Structured reports</span>
              <span>Study copilot</span>
              <span>Gemini + Pinecone ready</span>
            </div>
          </div>

          <div className="hero-board">
            <div className="sticky-card yellow rotate-left">
              <div className="sticky-label">ResearchPilot</div>
              <strong>Title</strong>
              <p>Abstract, key findings, sources, conclusion, follow-up questions.</p>
            </div>
            <div className="sticky-card blue rotate-right">
              <div className="sticky-label">AskMyNotes</div>
              <strong>Study Copilot</strong>
              <p>Three subject spaces, uploads, grounded Q and A, quiz mode.</p>
            </div>
            <div className="tape-strip">Live sources • structured output • note-grounded answers • revision flow</div>
          </div>
        </section>

        <section className="landing-marquee">
          <div className="marquee-track">
            <span>Research planning</span>
            <span>Topic expansion</span>
            <span>Source-backed output</span>
            <span>PDF note parsing</span>
            <span>Study quizzes</span>
            <span>Gemini-assisted workflows</span>
          </div>
        </section>

        <section className="feature-board">
          <FeatureCard
            title="Research mode that feels academic"
            body="Frame open-ended topics, generate structured reports, expand the topic into sharper directions, and keep report history in one place."
            badge="01"
            tone="yellow"
          />
          <FeatureCard
            title="Study Copilot that stays grounded"
            body="Upload notes by subject, ask questions from the actual material, and get confidence, evidence, and citations instead of generic responses."
            badge="02"
            tone="blue"
          />
          <FeatureCard
            title="One platform, two serious workflows"
            body="Move between research synthesis and note-grounded study sessions without losing the feeling of one coherent product."
            badge="03"
            tone="rose"
          />
        </section>

        <section className="how-grid" id="workflow">
          <div className="how-panel">
            <div className="hero-kicker">How It Works</div>
            <h2>From idea to answer in three clean steps.</h2>
            <p>
              The workflow now keeps research and study separated, while still feeling like one unified platform.
            </p>
          </div>
          <div className="how-step">
            <span className="step-no">01</span>
            <h3>Choose the mode</h3>
            <p>Start with a research topic or open a subject-based study workspace.</p>
          </div>
          <div className="how-step">
            <span className="step-no">02</span>
            <h3>Build context</h3>
            <p>Generate structured reports or upload notes and prepare semantic study context.</p>
          </div>
          <div className="how-step">
            <span className="step-no">03</span>
            <h3>Use the output</h3>
            <p>Export findings, expand the topic, ask grounded questions, or generate quizzes for revision.</p>
          </div>
        </section>

        <section className="bottom-cta">
          <div>
            <div className="hero-kicker">Step Inside</div>
            <h2>Choose the workspace that fits the way you think.</h2>
          </div>
          <div className="hero-actions">
            <Link href="/research" className="sketch-btn primary">Go to Research</Link>
            <Link href="/study" className="sketch-btn blue">Go to Study Copilot</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
