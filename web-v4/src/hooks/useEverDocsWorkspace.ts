import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { onDisconnect, onValue, ref, set } from "firebase/database";
import { auth, firestore, provider, rtdb } from "@/lib/firebase";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

type ShareRole = "editor" | "viewer" | "admin";

type AnyRecord = Record<string, any>;

type StatusState = {
  message: string;
  isError: boolean;
};

type ListenerKey = "docs" | "channels" | "doc" | "chat" | "files" | "presence" | "typing" | "connection";

type Listeners = Record<ListenerKey, Unsubscribe | null>;

type Timers = {
  save: number | null;
  typing: number | null;
};

type StateRef = {
  currentUser: User | null;
  currentDocId: string;
  currentDocChannelId: string;
  currentChannelId: string;
  hasManualChannelSelection: boolean;
  lastChannels: AnyRecord[];
  localEditing: boolean;
  realtimeConnected: boolean;
  editorValue: string;
};

function toDateTime(value: any): string {
  if (!value) {
    return "";
  }
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  return "";
}

function toMillis(value: any): number {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

function asErrorMessage(error: unknown, fallback: string): string {
  return (error as { message?: string })?.message || fallback;
}

function formatAuthError(error: unknown): string {
  if ((error as { code?: string })?.code === "auth/unauthorized-domain") {
    return "Auth blocked: use http://localhost:5000 and add localhost/127.0.0.1 in Firebase Auth authorized domains.";
  }
  return asErrorMessage(error, "Authentication failed");
}

export function useEverDocsWorkspace() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [docs, setDocs] = useState<AnyRecord[]>([]);
  const [channels, setChannels] = useState<AnyRecord[]>([]);
  const [messages, setMessages] = useState<AnyRecord[]>([]);
  const [files, setFiles] = useState<AnyRecord[]>([]);

  const [currentDocId, setCurrentDocId] = useState("");
  const [currentDocTitle, setCurrentDocTitle] = useState("Open a document");
  const [currentDocChannelId, setCurrentDocChannelId] = useState("");
  const [currentChannelId, setCurrentChannelId] = useState("");

  const [editorValue, setEditorValue] = useState("");
  const [saveState, setSaveState] = useState("Autosave: idle");
  const [status, setStatus] = useState<StatusState>({ message: "Ready.", isError: false });
  const [presenceText, setPresenceText] = useState("Presence: offline");
  const [collabText, setCollabText] = useState("Collaborators: 0");
  const [typingText, setTypingText] = useState("Typing: none");
  const [channelHint, setChannelHint] = useState(
    "Open a document to use its linked channel, or create a standalone channel."
  );

  const [shareUid, setShareUid] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("editor");
  const [inviteChannelUid, setInviteChannelUid] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("AI output will appear here.");
  const [metricsOutput, setMetricsOutput] = useState("Admin metrics appear here.");

  const listenersRef = useRef<Listeners>({
    docs: null,
    channels: null,
    doc: null,
    chat: null,
    files: null,
    presence: null,
    typing: null,
    connection: null
  });

  const timersRef = useRef<Timers>({ save: null, typing: null });

  const stateRef = useRef<StateRef>({
    currentUser: null,
    currentDocId: "",
    currentDocChannelId: "",
    currentChannelId: "",
    hasManualChannelSelection: false,
    lastChannels: [],
    localEditing: false,
    realtimeConnected: false,
    editorValue: ""
  });

  function setStatusMessage(message: string, isError = false) {
    setStatus({ message, isError });
  }

  function setSaveMessage(message: string, isError = false) {
    setSaveState(message);
    if (isError) {
      setStatusMessage(message, true);
    }
  }

  function shortUid(uid: string): string {
    if (!uid) {
      return "unknown";
    }
    if (stateRef.current.currentUser && uid === stateRef.current.currentUser.uid) {
      return "you";
    }
    return `${uid.slice(0, 6)}...`;
  }

  function stopListener(key: ListenerKey) {
    const unsub = listenersRef.current[key];
    if (typeof unsub === "function") {
      unsub();
    }
    listenersRef.current[key] = null;
  }

  function cleanupDocScopedListeners() {
    stopListener("doc");
    stopListener("chat");
    stopListener("files");
    stopListener("presence");
    stopListener("typing");
  }

  function cleanupAuthScopedListeners() {
    cleanupDocScopedListeners();
    stopListener("docs");
    stopListener("channels");
  }

  function clearEditorTimers() {
    if (timersRef.current.save) {
      window.clearTimeout(timersRef.current.save);
      timersRef.current.save = null;
    }
    if (timersRef.current.typing) {
      window.clearTimeout(timersRef.current.typing);
      timersRef.current.typing = null;
    }
  }

  async function api(path: string, options: { method?: string; body?: AnyRecord } = {}) {
    const user = stateRef.current.currentUser;
    if (!user) {
      throw new Error("Not authenticated");
    }

    const token = await user.getIdToken();
    const response = await fetch(`/api${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Request failed (${response.status})`);
    }

    return payload;
  }

  async function updatePresence(activeDoc: string | null = null) {
    const user = stateRef.current.currentUser;
    if (!user || !stateRef.current.realtimeConnected) {
      return;
    }

    try {
      const presenceRef = ref(rtdb, `presence/${user.uid}`);
      await set(presenceRef, {
        online: true,
        lastSeen: Date.now(),
        activeDoc
      });

      await onDisconnect(presenceRef).set({
        online: false,
        lastSeen: Date.now(),
        activeDoc: null
      });
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to update presence"), true);
    }
  }

  async function setTypingState(isTyping: boolean) {
    const user = stateRef.current.currentUser;
    const docId = stateRef.current.currentDocId;

    if (!user || !docId) {
      return;
    }

    try {
      const typingRef = ref(rtdb, `typing/docs/${docId}/${user.uid}`);
      await set(typingRef, isTyping ? Date.now() : null);
    } catch {
      // Typing state is best-effort only.
    }
  }

  function subscribeChat(channelId = stateRef.current.currentChannelId) {
    stopListener("chat");

    if (!channelId) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(firestore, "channels", channelId, "messages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    listenersRef.current.chat = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).reverse();
        setMessages(items);
      },
      (error) => {
        setMessages([]);
        setStatusMessage(asErrorMessage(error, "Chat subscription failed"), true);
      }
    );
  }

  function subscribeFiles(docId = stateRef.current.currentDocId) {
    stopListener("files");

    if (!docId) {
      setFiles([]);
      return;
    }

    const filesQuery = query(collection(firestore, "files"), where("docId", "==", docId), limit(30));

    listenersRef.current.files = onSnapshot(
      filesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setFiles(items);
      },
      (error) => {
        setFiles([]);
        setStatusMessage(asErrorMessage(error, "File subscription failed"), true);
      }
    );
  }

  function subscribeCollaborationState(docId = stateRef.current.currentDocId) {
    stopListener("presence");
    stopListener("typing");
    setCollabText("Collaborators: 0");
    setTypingText("Typing: none");

    const user = stateRef.current.currentUser;
    if (!user || !docId) {
      return;
    }

    listenersRef.current.presence = onValue(
      ref(rtdb, "presence"),
      (snapshot) => {
        const values = snapshot.val() || {};
        const active = Object.entries(values)
          .filter(([, value]) => value && (value as AnyRecord).online === true && (value as AnyRecord).activeDoc === docId)
          .map(([uid]) => uid);

        const preview = active.slice(0, 3).map((uid) => shortUid(uid));
        const summary = preview.length ? ` (${preview.join(", ")})` : "";
        setCollabText(`Collaborators: ${active.length}${summary}`);
      },
      () => {
        setCollabText("Collaborators: unknown");
      }
    );

    listenersRef.current.typing = onValue(
      ref(rtdb, `typing/docs/${docId}`),
      (snapshot) => {
        const values = snapshot.val() || {};
        const now = Date.now();
        const activeTypers = Object.entries(values)
          .filter(([uid, value]) => {
            if (!value || uid === user.uid) {
              return false;
            }
            return typeof value === "number" && now - value < 6000;
          })
          .map(([uid]) => shortUid(uid));

        setTypingText(activeTypers.length ? `Typing: ${activeTypers.join(", ")}` : "Typing: none");
      },
      () => {
        setTypingText("Typing: unknown");
      }
    );
  }

  function setActiveChannel(channelId: string, manualSelection = false) {
    const normalized = channelId || "";

    stateRef.current.currentChannelId = normalized;
    stateRef.current.hasManualChannelSelection = manualSelection;
    setCurrentChannelId(normalized);

    if (!normalized) {
      setChannelHint("No channel selected.");
      setMessages([]);
      subscribeChat("");
      return;
    }

    const activeChannel = stateRef.current.lastChannels.find((channel) => channel.id === normalized);
    const channelName = activeChannel?.name || `${normalized.slice(0, 6)}...`;
    const linkedToDoc = normalized === stateRef.current.currentDocChannelId;

    setChannelHint(
      linkedToDoc
        ? `Using document channel: ${channelName}`
        : `Using standalone channel: ${channelName}`
    );

    subscribeChat(normalized);
  }

  function subscribeDocuments() {
    stopListener("docs");

    const user = stateRef.current.currentUser;
    if (!user) {
      setDocs([]);
      return;
    }

    const docsQuery = query(collection(firestore, "documents"), where("memberIds", "array-contains", user.uid), limit(50));

    listenersRef.current.docs = onSnapshot(
      docsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
        setDocs(items);
      },
      (error) => {
        setDocs([]);
        setStatusMessage(asErrorMessage(error, "Document subscription failed"), true);
      }
    );
  }

  function subscribeChannels() {
    stopListener("channels");

    const user = stateRef.current.currentUser;
    if (!user) {
      setChannels([]);
      return;
    }

    const channelsQuery = query(collection(firestore, "channels"), where("memberIds", "array-contains", user.uid), limit(40));

    listenersRef.current.channels = onSnapshot(
      channelsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));

        stateRef.current.lastChannels = items;
        setChannels(items);

        if (stateRef.current.currentChannelId && !items.some((item) => item.id === stateRef.current.currentChannelId)) {
          stateRef.current.currentChannelId = "";
          setCurrentChannelId("");
        }

        if (!stateRef.current.currentChannelId && stateRef.current.currentDocChannelId) {
          setActiveChannel(stateRef.current.currentDocChannelId, false);
        }
      },
      (error) => {
        setChannels([]);
        setStatusMessage(asErrorMessage(error, "Channel subscription failed"), true);
      }
    );
  }

  async function openDocument(docId: string) {
    const user = stateRef.current.currentUser;
    if (!user) {
      return;
    }

    stateRef.current.currentDocId = docId;
    stateRef.current.currentDocChannelId = "";
    stateRef.current.hasManualChannelSelection = false;

    setCurrentDocId(docId);
    setCurrentDocChannelId("");

    cleanupDocScopedListeners();
    subscribeFiles(docId);
    subscribeCollaborationState(docId);

    await updatePresence(docId);
    setSaveMessage("Autosave: ready");

    const docRef = doc(firestore, "documents", docId);
    listenersRef.current.doc = onSnapshot(
      docRef,
      (snapshot) => {
        const data = snapshot.data();
        if (!data) {
          return;
        }

        setCurrentDocTitle(data.title || "Untitled");

        if (!stateRef.current.localEditing) {
          const latest = data.content || "";
          stateRef.current.editorValue = latest;
          setEditorValue(latest);
        }

        const nextChannelId = data.channelId || "";
        const docChannelChanged =
          stateRef.current.currentDocChannelId && stateRef.current.currentDocChannelId !== nextChannelId;

        stateRef.current.currentDocChannelId = nextChannelId;
        setCurrentDocChannelId(nextChannelId);

        if (!stateRef.current.hasManualChannelSelection || !stateRef.current.currentChannelId || docChannelChanged) {
          setActiveChannel(nextChannelId, false);
        }

        if (stateRef.current.realtimeConnected) {
          setPresenceText(`Presence: online in ${docId.slice(0, 6)}...`);
        }
      },
      (error) => {
        setStatusMessage(asErrorMessage(error, "Could not open document"), true);
      }
    );
  }

  async function saveCurrentDocument(trigger: "manual" | "autosave" = "manual") {
    const docId = stateRef.current.currentDocId;
    if (!docId) {
      setStatusMessage("Open a document first", true);
      return;
    }

    setSaveMessage("Saving...");

    try {
      await api(`/docs/${docId}/content`, {
        method: "PATCH",
        body: { content: stateRef.current.editorValue }
      });

      const savedAt = new Date().toLocaleTimeString();
      setSaveMessage(`Saved at ${savedAt}`);

      if (trigger === "manual") {
        setStatusMessage("Document saved");
      }
    } catch (error) {
      setSaveMessage("Save failed");
      setStatusMessage(asErrorMessage(error, "Save failed"), true);
    }
  }

  function monitorRealtimeConnection() {
    stopListener("connection");

    listenersRef.current.connection = onValue(ref(rtdb, ".info/connected"), (snapshot) => {
      stateRef.current.realtimeConnected = snapshot.val() === true;

      if (!stateRef.current.currentUser) {
        setPresenceText("Presence: offline");
        return;
      }

      if (stateRef.current.realtimeConnected) {
        const suffix = stateRef.current.currentDocId ? ` in ${stateRef.current.currentDocId.slice(0, 6)}...` : "";
        setPresenceText(`Presence: online${suffix}`);
        void updatePresence(stateRef.current.currentDocId || null);
        return;
      }

      setPresenceText("Presence: reconnecting...");
    });
  }

  async function signInWithGoogle() {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setStatusMessage(formatAuthError(error), true);
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  async function copyUid() {
    if (!stateRef.current.currentUser) {
      return;
    }

    try {
      await navigator.clipboard.writeText(stateRef.current.currentUser.uid);
      setStatusMessage("UID copied");
    } catch {
      setStatusMessage("Could not copy UID", true);
    }
  }

  async function createDocument() {
    try {
      const title = window.prompt("Document title", "Untitled Document");
      if (!title) {
        return;
      }

      const result = await api("/docs/create", {
        method: "POST",
        body: { title }
      });

      setStatusMessage("Document created");
      await openDocument(result.docId);
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to create document"), true);
    }
  }

  async function shareDocumentByUid(targetUid: string, role: ShareRole = "editor") {
    const docId = stateRef.current.currentDocId;
    if (!docId) {
      setStatusMessage("Open a document before sharing", true);
      return;
    }

    if (!targetUid.trim()) {
      setStatusMessage("Enter collaborator UID", true);
      return;
    }

    try {
      await api(`/docs/${docId}/share`, {
        method: "POST",
        body: {
          targetUid: targetUid.trim(),
          role
        }
      });
      setStatusMessage("Document shared");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to share document"), true);
    }
  }

  async function shareCurrentDocument() {
    await shareDocumentByUid(shareUid, shareRole);
    setShareUid("");
  }

  function handleEditorInput(nextValue: string) {
    setEditorValue(nextValue);
    stateRef.current.editorValue = nextValue;

    if (!stateRef.current.currentDocId) {
      return;
    }

    stateRef.current.localEditing = true;
    setSaveMessage("Autosave: pending...");

    if (timersRef.current.typing) {
      window.clearTimeout(timersRef.current.typing);
    }

    void setTypingState(true);

    timersRef.current.typing = window.setTimeout(() => {
      void setTypingState(false);
      stateRef.current.localEditing = false;
      timersRef.current.typing = null;
    }, 1200);

    if (timersRef.current.save) {
      window.clearTimeout(timersRef.current.save);
    }

    timersRef.current.save = window.setTimeout(() => {
      void saveCurrentDocument("autosave");
      timersRef.current.save = null;
    }, 650);
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveCurrentDocument("manual");
    }
  }

  async function createChannel() {
    try {
      const name = window.prompt("Channel name", "General");
      if (!name) {
        return;
      }

      const result = await api("/chat/channels", {
        method: "POST",
        body: { name }
      });

      setStatusMessage("Channel created");
      setActiveChannel(result.channelId, true);
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to create channel"), true);
    }
  }

  async function inviteToChannelByUid(targetUid: string) {
    if (!stateRef.current.currentChannelId) {
      setStatusMessage("Select a channel before inviting", true);
      return;
    }

    if (!targetUid.trim()) {
      setStatusMessage("Enter UID to invite", true);
      return;
    }

    try {
      await api(`/chat/${stateRef.current.currentChannelId}/share`, {
        method: "POST",
        body: {
          targetUid: targetUid.trim(),
          role: "editor"
        }
      });
      setStatusMessage("User invited to channel");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to invite user"), true);
    }
  }

  async function inviteToChannel() {
    await inviteToChannelByUid(inviteChannelUid);
    setInviteChannelUid("");
  }

  async function sendChatMessage() {
    if (!stateRef.current.currentChannelId) {
      setStatusMessage("No channel selected", true);
      return;
    }

    const text = chatInput.trim();
    if (!text) {
      return;
    }

    try {
      await api(`/chat/${stateRef.current.currentChannelId}/messages`, {
        method: "POST",
        body: { text }
      });
      setChatInput("");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to send message"), true);
    }
  }

  function handleChatKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendChatMessage();
    }
  }

  async function uploadFile(file: File) {
    if (!stateRef.current.currentDocId) {
      setStatusMessage("Open a document first", true);
      return;
    }

    if (!file) {
      return;
    }

    try {
      setStatusMessage("Preparing upload...");
      const prep = await api("/files/create-upload", {
        method: "POST",
        body: {
          docId: stateRef.current.currentDocId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size
        }
      });

      if (!supabase) {
        throw new Error("Supabase not configured");
      }

      const { error } = file.type
        ? await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(prep.storagePath, file, { contentType: file.type })
        : await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(prep.storagePath, file);

      if (error) {
        throw new Error(error.message);
      }

      await api(`/files/${prep.fileId}/complete`, { method: "POST" });

      setStatusMessage("Upload completed");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Upload failed"), true);
    }
  }

  async function requestDownloadUrl(fileId: string) {
    try {
      const response = await api(`/files/${fileId}/download-url`);
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to get download URL"), true);
    }
  }

  async function summarizeCurrentDocument() {
    if (!stateRef.current.currentDocId) {
      setStatusMessage("Open a document first", true);
      return;
    }

    try {
      setStatusMessage("Generating summary...");
      const response = await api("/ai/summarize", {
        method: "POST",
        body: { docId: stateRef.current.currentDocId }
      });
      setAiOutput(response.content);
      setStatusMessage("Summary ready");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Summary failed"), true);
    }
  }

  async function generateAiContent() {
    const prompt = generatePrompt.trim();
    if (!prompt) {
      setStatusMessage("Enter an AI prompt", true);
      return;
    }

    try {
      setStatusMessage("Generating content...");
      const response = await api("/ai/generate", {
        method: "POST",
        body: {
          prompt,
          docId: stateRef.current.currentDocId || null
        }
      });
      setAiOutput(response.content);
      setStatusMessage("AI content ready");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Generation failed"), true);
    }
  }

  async function loadMetrics() {
    try {
      const metrics = await api("/admin/metrics");
      setMetricsOutput(JSON.stringify(metrics, null, 2));
      setStatusMessage("Metrics loaded");
    } catch (error) {
      setStatusMessage(asErrorMessage(error, "Failed to load metrics"), true);
    }
  }

  useEffect(() => {
    monitorRealtimeConnection();

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      stateRef.current.currentUser = user;
      setCurrentUser(user);

      cleanupAuthScopedListeners();
      clearEditorTimers();

      stateRef.current.currentDocId = "";
      stateRef.current.currentDocChannelId = "";
      stateRef.current.currentChannelId = "";
      stateRef.current.hasManualChannelSelection = false;
      stateRef.current.localEditing = false;
      stateRef.current.lastChannels = [];
      stateRef.current.editorValue = "";

      setCurrentDocId("");
      setCurrentDocTitle("Open a document");
      setCurrentDocChannelId("");
      setCurrentChannelId("");
      setEditorValue("");
      setDocs([]);
      setChannels([]);
      setMessages([]);
      setFiles([]);
      setAiOutput("AI output will appear here.");
      setMetricsOutput("Admin metrics appear here.");
      setShareUid("");
      setInviteChannelUid("");
      setChatInput("");
      setGeneratePrompt("");
      setShareRole("editor");
      setCollabText("Collaborators: 0");
      setTypingText("Typing: none");
      setChannelHint("Open a document to use its linked channel, or create a standalone channel.");
      setSaveMessage("Autosave: idle");

      if (!user) {
        setPresenceText("Presence: offline");
        setStatusMessage("Signed out");
        return;
      }

      await updatePresence(null);
      setPresenceText(stateRef.current.realtimeConnected ? "Presence: online" : "Presence: reconnecting...");
      subscribeDocuments();
      subscribeChannels();
      setStatusMessage(`Signed in as ${user.email || user.uid}`);
    });

    return () => {
      authUnsub();
      cleanupAuthScopedListeners();
      stopListener("connection");
      clearEditorTimers();
    };
  }, []);

  return {
    currentUser,
    docs,
    channels,
    messages,
    files,
    currentDocId,
    currentDocTitle,
    currentDocChannelId,
    currentChannelId,
    editorValue,
    saveState,
    status,
    presenceText,
    collabText,
    typingText,
    channelHint,
    shareUid,
    shareRole,
    inviteChannelUid,
    chatInput,
    generatePrompt,
    aiOutput,
    metricsOutput,
    signedIn: Boolean(currentUser),
    uidLabel: currentUser ? `UID: ${currentUser.uid}` : "UID: -",
    toDateTime,
    shortUid,
    signInWithGoogle,
    signOutUser,
    copyUid,
    createDocument,
    openDocument,
    saveCurrentDocument,
    shareCurrentDocument,
    shareDocumentByUid,
    handleEditorInput,
    handleEditorKeyDown,
    setShareUid,
    setShareRole,
    createChannel,
    setActiveChannel,
    setInviteChannelUid,
    inviteToChannel,
    inviteToChannelByUid,
    setChatInput,
    sendChatMessage,
    handleChatKeyDown,
    uploadFile,
    requestDownloadUrl,
    summarizeCurrentDocument,
    setGeneratePrompt,
    generateAiContent,
    loadMetrics
  };
}
