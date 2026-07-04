import { Link } from "react-router-dom";

const featureCards = [
  {
    title: "Realtime Editing",
    body: "Presence, typing, and autosave over Firestore + Realtime Database tuned for free-tier usage."
  },
  {
    title: "Team Channels",
    body: "Discuss in doc-linked channels, invite collaborators by UID, and keep work context tight."
  },
  {
    title: "AI + Files",
    body: "Summarize docs, generate drafts, and manage uploads inside one focused workspace."
  }
];

export function LandingPage({ workspace }) {
  return (
    <div className="page landing-page">
      <header className="top-nav panel-surface">
        <div className="brand-wrap">
          <span className="brand-token">ED</span>
          <div>
            <h1>EverDocs</h1>
            <p>Production-styled Firebase collaboration suite</p>
          </div>
        </div>
        <div className="nav-actions">
          {workspace.signedIn && <span className="pill-pill">Signed in</span>}
          <a
            className="btn ghost"
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link className="btn primary" to="/workspace">
            Enter Workspace
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero panel-surface">
          <small className="eyebrow">FREE-TIER WORKFLOW</small>
          <h2>Design, write, chat, upload, and generate without leaving the same workspace.</h2>
          <p>
            This React + Vite redesign keeps the full EverDocs capability set while introducing a cleaner information
            hierarchy and a faster page structure.
          </p>
          <div className="hero-cta">
            <Link className="btn primary" to="/workspace">
              Open Main Page
            </Link>
            <a
              className="btn ghost"
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source
            </a>
          </div>
        </section>

        <section className="feature-grid">
          {featureCards.map((item) => (
            <article key={item.title} className="feature-card panel-surface">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </section>

        <section className="quick-facts panel-surface">
          <h3>Workspace Status</h3>
          <p>{workspace.status.message}</p>
          {workspace.signedIn && <small>{workspace.uidLabel}</small>}
        </section>
      </main>
    </div>
  );
}
