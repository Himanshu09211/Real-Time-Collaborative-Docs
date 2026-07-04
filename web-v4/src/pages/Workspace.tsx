import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useEverDocsWorkspace } from "@/hooks/useEverDocsWorkspace";
import {
  FileText, Plus, Search, Sparkles, MessageSquare, Hash,
  Paperclip, Send, Wand2, Share2, Users, MoreHorizontal, Smile, CornerDownLeft, Zap,
  Maximize2, Minimize2
} from "lucide-react";

const Workspace = () => {
  const workspace = useEverDocsWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const presenceNames = useMemo(() => {
    const match = workspace.collabText.match(/\(([^)]+)\)/);
    if (!match?.[1]) {
      return workspace.signedIn ? ["you"] : [];
    }
    return match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [workspace.collabText, workspace.signedIn]);

  const toggleFullscreen = () => {
    setIsFullscreen((v) => !v);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const summarize = async () => {
    setAiBusy(true);
    try {
      await workspace.summarizeCurrentDocument();
    } finally {
      setAiBusy(false);
    }
  };

  const generate = async () => {
    setAiBusy(true);
    try {
      await workspace.generateAiContent();
    } finally {
      setAiBusy(false);
    }
  };

  const promptShare = async () => {
    const targetUid = window.prompt("Collaborator UID", workspace.shareUid || "");
    if (!targetUid) {
      return;
    }

    const roleInput = window.prompt("Role (viewer/editor/admin)", workspace.shareRole || "editor");
    const normalizedRole = (roleInput || "editor").toLowerCase();
    const role = normalizedRole === "viewer" || normalizedRole === "admin" ? normalizedRole : "editor";
    await workspace.shareDocumentByUid(targetUid, role);
  };

  const promptInvite = async () => {
    const targetUid = window.prompt("Invite UID to active channel", workspace.inviteChannelUid || "");
    if (!targetUid) {
      return;
    }
    await workspace.inviteToChannelByUid(targetUid);
  };

  const onPickFile = () => {
    if (!workspace.signedIn) {
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className={isFullscreen ? "" : "pt-24 flex-1 flex"}>
        <div className={isFullscreen ? "fixed inset-0 z-[60] bg-background p-3 flex" : "mx-auto max-w-[1500px] w-full px-4 sm:px-6 lg:px-8 pb-6 flex-1 flex flex-col gap-3"}>
          {!isFullscreen && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-display">Backend status</div>
                <div className={`text-xs ${workspace.status.isError ? "text-destructive" : "text-muted-foreground"}`}>
                  {workspace.status.message}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {workspace.signedIn ? (
                  <>
                    <span className="text-xs text-muted-foreground">{workspace.uidLabel}</span>
                    <Button variant="outline" size="sm" onClick={workspace.copyUid}>Copy UID</Button>
                    <Button variant="outline" size="sm" onClick={workspace.signOutUser}>Sign out</Button>
                  </>
                ) : (
                  <Button variant="default" size="sm" onClick={workspace.signInWithGoogle}>Sign in with Google</Button>
                )}
              </div>
            </div>
          )}

          <div ref={workspaceRef} className={`rounded-2xl bg-card border border-border flex-1 grid grid-cols-12 overflow-hidden relative ${isFullscreen ? "h-full" : "min-h-[calc(100vh-7rem)]"}`} id="workspace-container">

            {/* Sidebar - Docs */}
            <aside className="col-span-3 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-display">Workspace</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={workspace.createDocument} disabled={!workspace.signedIn}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2 surface-2 rounded-lg px-2.5 py-1.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Search docs"
                  />
                </div>
              </div>

              <div className="p-3 flex-1 overflow-y-auto">
                <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">Docs</div>
                <div className="space-y-1">
                  {workspace.docs.length === 0 && (
                    <div className="px-2.5 py-2 text-xs text-muted-foreground">No documents yet.</div>
                  )}
                  {workspace.docs.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => workspace.openDocument(d.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                      workspace.currentDocId === d.id
                        ? "bg-primary/10 text-foreground border border-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    >
                      <span className="text-base">📄</span>
                      <span className="flex-1 truncate">{d.title || "Untitled"}</span>
                      <span className="text-[10px] text-muted-foreground">{workspace.toDateTime(d.updatedAt)}</span>
                    </button>
                  ))}
                </div>

                <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 mt-6 mb-2">Channels</div>
                <div className="space-y-1">
                  {workspace.channels.length === 0 && (
                    <div className="px-2.5 py-2 text-xs text-muted-foreground">No channels yet.</div>
                  )}
                  {workspace.channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => workspace.setActiveChannel(channel.id, true)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                      workspace.currentChannelId === channel.id
                        ? "bg-secondary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    >
                      <Hash className="h-3.5 w-3.5" />
                      <span className="flex-1">{channel.name || "Unnamed"}</span>
                      {workspace.currentChannelId === channel.id && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 border-t border-border flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-display text-primary-foreground">
                  {workspace.signedIn ? "Y" : "G"}
                </div>
                <div className="text-xs">
                  <div className="text-foreground">{workspace.signedIn ? "You" : "Guest"}</div>
                  <div className="text-muted-foreground">{workspace.presenceText.replace("Presence: ", "")}</div>
                </div>
              </div>
            </aside>

            {/* Editor */}
            <main className="col-span-6 flex flex-col">
              <div className="px-6 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Docs</span>
                  <span className="text-border">/</span>
                  <span className="text-foreground">{workspace.currentDocTitle}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {presenceNames.map((name, index) => (
                      <div
                        key={`${name}-${index}`}
                        title={name}
                        className="h-7 w-7 rounded-full bg-primary border-2 border-background flex items-center justify-center text-[10px] font-display text-primary-foreground"
                      >
                        {name[0]?.toUpperCase() || "?"}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={promptShare} disabled={!workspace.signedIn || !workspace.currentDocId}>
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="px-10 py-8 flex-1 overflow-y-auto">
                <div className="text-xs text-muted-foreground">{workspace.collabText} · {workspace.typingText}</div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <h2 className="flex-1 bg-transparent outline-none font-display text-4xl tracking-tight">{workspace.currentDocTitle}</h2>
                </div>

                <textarea
                  value={workspace.editorValue}
                  onChange={(e) => workspace.handleEditorInput(e.target.value)}
                  onKeyDown={workspace.handleEditorKeyDown}
                  disabled={!workspace.currentDocId}
                  className="mt-6 w-full min-h-[420px] bg-transparent outline-none font-mono text-sm leading-7 text-foreground/90 resize-none"
                />

                <div className="mt-3 text-xs text-muted-foreground">{workspace.saveState}</div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => workspace.saveCurrentDocument("manual")} disabled={!workspace.signedIn || !workspace.currentDocId}>
                    Save now
                  </Button>
                  <Button variant="outline" size="sm" onClick={workspace.loadMetrics} disabled={!workspace.signedIn}>
                    Load metrics
                  </Button>
                </div>

                <pre className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground overflow-auto">{workspace.metricsOutput}</pre>

                {/* AI panel */}
                <div className="mt-6 rounded-2xl bg-muted border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Wand2 className="h-4 w-4 text-secondary" />
                      <span className="font-display">AI co-author</span>
                      <span className="text-xs text-muted-foreground">· /ai/summarize · /ai/generate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={summarize} disabled={aiBusy}>
                        <Sparkles className="h-3.5 w-3.5" /> {aiBusy ? "Thinking…" : "Summarize"}
                      </Button>
                      <Button variant="default" size="sm" className="gap-2" onClick={generate} disabled={aiBusy || !workspace.signedIn}>
                        <Zap className="h-3.5 w-3.5" /> Generate
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      value={workspace.generatePrompt}
                      onChange={(e) => workspace.setGeneratePrompt(e.target.value)}
                      placeholder="Prompt (e.g. draft release notes)"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {workspace.aiOutput && (
                    <div className="mt-4 surface-3 rounded-xl p-4 text-sm text-foreground/90 animate-fade-up">
                      {workspace.aiOutput}
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => workspace.handleEditorInput(`${workspace.editorValue}\n\n${workspace.aiOutput}`)}>
                          Insert
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => navigator.clipboard.writeText(workspace.aiOutput)}>
                          Copy
                        </Button>
                        <span className="ml-auto text-muted-foreground inline-flex items-center gap-1">accept <CornerDownLeft className="h-3 w-3" /></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>

            {/* Chat */}
            <aside className="col-span-3 border-l border-border flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display">{workspace.currentChannelId ? (workspace.channels.find((c) => c.id === workspace.currentChannelId)?.name || "channel") : "no-channel"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {presenceNames.length}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={promptInvite} disabled={!workspace.signedIn || !workspace.currentChannelId}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {workspace.messages.length === 0 && (
                  <div className="text-xs text-muted-foreground">No messages yet.</div>
                )}
                {workspace.messages.map((m) => (
                  <div key={m.id} className="text-sm animate-fade-up">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-primary">{workspace.shortUid(m.senderId || "")}</span>
                      <span className="text-[10px] text-muted-foreground">{workspace.toDateTime(m.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 text-foreground/90">{m.text || ""}</div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse-glow" />
                    <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse-glow [animation-delay:200ms]" />
                    <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse-glow [animation-delay:400ms]" />
                  </span>
                  {workspace.typingText}
                </div>
              </div>

              <div className="p-3 border-t border-border">
                <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void workspace.uploadFile(file);
                      }
                      event.target.value = "";
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPickFile}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <input
                    value={workspace.chatInput}
                    onChange={(e) => workspace.setChatInput(e.target.value)}
                    onKeyDown={workspace.handleChatKeyDown}
                    placeholder={workspace.currentChannelId ? "Message channel..." : "Select a channel first"}
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button>
                  <Button variant="default" size="icon" className="h-7 w-7" onClick={workspace.sendChatMessage} disabled={!workspace.signedIn || !workspace.currentChannelId}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {workspace.channelHint}
                </div>
                <div className="mt-2 max-h-28 overflow-auto space-y-2">
                  {workspace.files.map((file) => (
                    <div key={file.id} className="text-[11px] flex items-center justify-between rounded border border-border px-2 py-1">
                      <span className="truncate pr-2">{file.fileName || "file"}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => workspace.requestDownloadUrl(file.id)}>
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
