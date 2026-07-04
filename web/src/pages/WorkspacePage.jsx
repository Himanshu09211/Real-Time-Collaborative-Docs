import { useRef } from "react";
import { Link } from "react-router-dom";

function EmptyState({ text }) {
  return <p className="empty-copy">{text}</p>;
}

export function WorkspacePage({ workspace }) {
  const fileInputRef = useRef(null);

  return (
    <div className="page workspace-page">
      <header className="workspace-topbar panel-surface">
        <div>
          <h1>EverDocs Workspace</h1>
          <p>Document operations, realtime collaboration, and AI in one surface</p>
        </div>

        <div className="workspace-topbar-actions">
          <Link className="btn ghost" to="/">
            Landing
          </Link>
          <a
            className="btn ghost"
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        <div className="workspace-topbar-actions">
          {workspace.signedIn && <small className="uid-label">{workspace.uidLabel}</small>}
          {workspace.signedIn && (
            <button className="btn ghost" onClick={workspace.copyUid}>
              Copy UID
            </button>
          )}
          {!workspace.signedIn && (
            <button className="btn primary" onClick={workspace.signInWithGoogle}>
              Sign in with Google
            </button>
          )}
          {workspace.signedIn && (
            <button className="btn danger" onClick={workspace.signOutUser}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <main className="workspace-layout">
        <aside className="panel-surface side-panel docs-column">
          <div className="section-head">
            <h2>Documents</h2>
            {workspace.signedIn && (
              <button className="btn primary" onClick={workspace.createDocument}>
                + New
              </button>
            )}
          </div>

          <div className="scroller-list">
            {workspace.docs.length === 0 && <EmptyState text="No documents yet." />}
            {workspace.docs.map((item) => (
              <article key={item.id} className="list-item">
                <div>
                  <strong>{item.title || "Untitled"}</strong>
                  <small>{workspace.toDateTime(item.updatedAt)}</small>
                </div>
                <button className="btn ghost" onClick={() => workspace.openDocument(item.id)}>
                  Open
                </button>
              </article>
            ))}
          </div>
        </aside>

        <section className="panel-surface editor-column">
          <div className="section-head align-top">
            <div>
              <h2>{workspace.currentDocTitle}</h2>
              <small className="meta-line">{workspace.presenceText}</small>
              <small className="meta-line">{workspace.collabText}</small>
              <small className="meta-line">{workspace.typingText}</small>
            </div>
            {workspace.signedIn && (
              <button className="btn ghost" onClick={() => workspace.saveCurrentDocument("manual")}>
                Save Now
              </button>
            )}
          </div>

          <textarea
            className="editor-input"
            value={workspace.editorValue}
            onChange={(event) => workspace.handleEditorInput(event.target.value)}
            onKeyDown={workspace.handleEditorKeyDown}
            placeholder="Select or create a document to start collaborating..."
          />

          <div className="row-controls">
            <small className="meta-line">{workspace.saveState}</small>
          </div>

          <div className="triple-control">
            <input
              value={workspace.shareUid}
              onChange={(event) => workspace.setShareUid(event.target.value)}
              placeholder="Collaborator UID"
            />
            <select
              value={workspace.shareRole}
              onChange={(event) => workspace.setShareRole(event.target.value)}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="btn ghost"
              disabled={!workspace.signedIn}
              onClick={workspace.shareCurrentDocument}
            >
              Share Doc
            </button>
          </div>

          <div className="double-control">
            <button
              className="btn primary"
              disabled={!workspace.signedIn}
              onClick={workspace.summarizeCurrentDocument}
            >
              AI Summarize
            </button>
            <input
              value={workspace.generatePrompt}
              onChange={(event) => workspace.setGeneratePrompt(event.target.value)}
              placeholder="AI prompt (e.g. draft release notes)"
            />
            <button className="btn primary" disabled={!workspace.signedIn} onClick={workspace.generateAiContent}>
              AI Generate
            </button>
          </div>

          <pre className="mono-block">{workspace.aiOutput}</pre>
        </section>

        <aside className="panel-surface side-panel activity-column">
          <section className="stack-section">
            <div className="section-head">
              <h2>Chat</h2>
              {workspace.signedIn && (
                <button className="btn ghost" onClick={workspace.createChannel}>
                  + Channel
                </button>
              )}
            </div>

            <small className="meta-line">{workspace.channelHint}</small>

            <div className="scroller-list compact">
              {workspace.channels.length === 0 && <EmptyState text="No channels yet." />}
              {workspace.channels.map((item) => (
                <article
                  key={item.id}
                  className={`list-item ${item.id === workspace.currentChannelId ? "is-active" : ""}`}
                >
                  <div>
                    <strong>
                      {item.name || "Unnamed channel"}
                      {item.id === workspace.currentDocChannelId ? " (doc)" : ""}
                    </strong>
                    <small>{workspace.toDateTime(item.updatedAt)}</small>
                  </div>
                  <button
                    className="btn ghost"
                    disabled={item.id === workspace.currentChannelId}
                    onClick={() => workspace.setActiveChannel(item.id, true)}
                  >
                    {item.id === workspace.currentChannelId ? "Active" : "Open"}
                  </button>
                </article>
              ))}
            </div>

            <div className="double-control">
              <input
                value={workspace.inviteChannelUid}
                onChange={(event) => workspace.setInviteChannelUid(event.target.value)}
                placeholder="Invite UID to active channel"
              />
              <button className="btn ghost" disabled={!workspace.signedIn} onClick={workspace.inviteToChannel}>
                Invite
              </button>
            </div>

            <div className="chat-stream">
              {workspace.messages.length === 0 && <EmptyState text="No messages yet." />}
              {workspace.messages.map((message) => (
                <article key={message.id} className="chat-bubble">
                  <p>{message.text || ""}</p>
                  <small>
                    {workspace.shortUid(message.senderId || "")} · {workspace.toDateTime(message.createdAt)}
                  </small>
                </article>
              ))}
            </div>

            <div className="double-control">
              <input
                value={workspace.chatInput}
                onChange={(event) => workspace.setChatInput(event.target.value)}
                onKeyDown={workspace.handleChatKeyDown}
                placeholder="Message channel..."
              />
              <button className="btn primary" disabled={!workspace.signedIn} onClick={workspace.sendChatMessage}>
                Send
              </button>
            </div>
          </section>

          <section className="stack-section">
            <h2>Files</h2>
            <input
              ref={fileInputRef}
              className="hidden-input"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void workspace.uploadFile(file);
                }
                event.target.value = "";
              }}
            />
            <button
              className="btn primary"
              disabled={!workspace.signedIn}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload File
            </button>
            <small className="meta-line">Uploads attach files to the active document (max 10MB).</small>

            <div className="scroller-list compact">
              {workspace.files.length === 0 && <EmptyState text="No files uploaded." />}
              {workspace.files.map((item) => (
                <article key={item.id} className="list-item">
                  <div>
                    <strong>{item.fileName || "file"}</strong>
                    <small>{item.status || "unknown"}</small>
                  </div>
                  <button className="btn ghost" onClick={() => workspace.requestDownloadUrl(item.id)}>
                    Download
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="stack-section">
            <h2>Admin</h2>
            <button className="btn primary" disabled={!workspace.signedIn} onClick={workspace.loadMetrics}>
              Load Metrics
            </button>
            <pre className="mono-block small">{workspace.metricsOutput}</pre>
          </section>
        </aside>
      </main>

      <footer className="status-strip panel-surface">
        <p className={workspace.status.isError ? "error-text" : ""}>{workspace.status.message}</p>
      </footer>
    </div>
  );
}
