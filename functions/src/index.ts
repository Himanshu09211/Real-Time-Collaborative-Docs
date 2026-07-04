import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { requireAuth } from "./lib/auth";
import { db, messaging } from "./lib/firebase";
import { supabaseAdmin } from "./lib/supabase";
import { callGemini } from "./lib/gemini";

type Role = "owner" | "admin" | "editor" | "viewer";

const WRITE_ROLES = new Set<Role>(["owner", "admin", "editor"]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeFileName(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned.length ? cleaned : "file";
}

function getAclRole(data: Record<string, unknown> | undefined, uid: string): Role | null {
  const acl = data?.acl as Record<string, unknown> | undefined;
  const role = acl?.[uid];
  if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return null;
}

function canRead(data: Record<string, unknown> | undefined, uid: string): boolean {
  const members = data?.memberIds;
  return Array.isArray(members) && members.includes(uid);
}

function canWrite(data: Record<string, unknown> | undefined, uid: string): boolean {
  const role = getAclRole(data, uid);
  return role !== null && WRITE_ROLES.has(role);
}

async function isAdmin(uid: string, token: Express.Request["user"]): Promise<boolean> {
  if (token?.admin === true) {
    return true;
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const role = userSnap.data()?.role;
  return role === "admin" || role === "owner";
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4);
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "everdocs-api" });
});

app.use(requireAuth);

app.post(
  "/docs/create",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const title = asString(req.body?.title, "Untitled Document").trim().slice(0, 120) || "Untitled Document";
    const content = asString(req.body?.content, "");
    const teamId = asString(req.body?.teamId, "personal").trim().slice(0, 64) || "personal";

    const docRef = db.collection("documents").doc();
    const channelRef = db.collection("channels").doc();

    const docData = {
      title,
      content,
      ownerId: uid,
      teamId,
      channelId: channelRef.id,
      memberIds: [uid],
      acl: {
        [uid]: "owner"
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastEditedBy: uid
    };

    const channelData = {
      name: `${title.slice(0, 50)} chat`,
      teamId,
      docId: docRef.id,
      ownerId: uid,
      memberIds: [uid],
      acl: {
        [uid]: "owner"
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await Promise.all([docRef.set(docData), channelRef.set(channelData)]);

    res.status(201).json({ docId: docRef.id, channelId: channelRef.id });
  })
);

app.get(
  "/docs/:docId",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const docRef = db.collection("documents").doc(req.params.docId);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const data = snap.data() as Record<string, unknown>;
    if (!canRead(data, uid)) {
      res.status(403).json({ error: "No access to this document" });
      return;
    }

    res.json({ id: snap.id, ...data });
  })
);

app.patch(
  "/docs/:docId/content",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const content = asString(req.body?.content, "");

    if (content.length > 200000) {
      res.status(400).json({ error: "Document is too large for this starter" });
      return;
    }

    const docRef = db.collection("documents").doc(req.params.docId);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const data = snap.data() as Record<string, unknown>;
    if (!canWrite(data, uid)) {
      res.status(403).json({ error: "No edit access" });
      return;
    }

    await docRef.update({
      content,
      updatedAt: FieldValue.serverTimestamp(),
      lastEditedBy: uid
    });

    await docRef.collection("ops").add({
      actorId: uid,
      type: "replace_content",
      contentLength: content.length,
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({ ok: true });
  })
);

app.post(
  "/docs/:docId/share",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const targetUid = asString(req.body?.targetUid, "").trim();
    const role = asString(req.body?.role, "viewer") as Role;
    if (!targetUid) {
      res.status(400).json({ error: "targetUid is required" });
      return;
    }

    if (!["viewer", "editor", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const docRef = db.collection("documents").doc(req.params.docId);
    const snap = await docRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const data = snap.data() as Record<string, unknown>;
    const requesterRole = getAclRole(data, uid);
    if (requesterRole !== "owner" && requesterRole !== "admin") {
      res.status(403).json({ error: "Only owner/admin can share" });
      return;
    }

    await docRef.update({
      [`acl.${targetUid}`]: role,
      memberIds: FieldValue.arrayUnion(targetUid),
      updatedAt: FieldValue.serverTimestamp()
    });

    const channelId = asString(data.channelId);
    if (channelId) {
      await db.collection("channels").doc(channelId).set(
        {
          [`acl.${targetUid}`]: role,
          memberIds: FieldValue.arrayUnion(targetUid),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    await db.collection("notifications").doc(targetUid).collection("items").add({
      type: "doc_shared",
      docId: docRef.id,
      byUid: uid,
      role,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({ ok: true });
  })
);

app.post(
  "/chat/channels",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const name = asString(req.body?.name, "General").trim().slice(0, 80) || "General";
    const teamId = asString(req.body?.teamId, "personal").trim().slice(0, 64) || "personal";

    const provided = Array.isArray(req.body?.memberIds)
      ? req.body.memberIds.filter((value: unknown) => typeof value === "string")
      : [];

    const uniqueMembers = [...new Set([uid, ...provided])];
    const acl: Record<string, Role> = {};
    for (const memberId of uniqueMembers) {
      acl[memberId] = memberId === uid ? "owner" : "editor";
    }

    const channelRef = db.collection("channels").doc();
    await channelRef.set({
      name,
      teamId,
      ownerId: uid,
      memberIds: uniqueMembers,
      acl,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).json({ channelId: channelRef.id });
  })
);

app.post(
  "/chat/:channelId/share",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const targetUid = asString(req.body?.targetUid, "").trim();
    const role = asString(req.body?.role, "editor") as Role;

    if (!targetUid) {
      res.status(400).json({ error: "targetUid is required" });
      return;
    }

    if (!["viewer", "editor", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const channelRef = db.collection("channels").doc(req.params.channelId);
    const channelSnap = await channelRef.get();
    if (!channelSnap.exists) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const channelData = channelSnap.data() as Record<string, unknown>;
    const requesterRole = getAclRole(channelData, uid);
    if (requesterRole !== "owner" && requesterRole !== "admin") {
      res.status(403).json({ error: "Only owner/admin can share channel" });
      return;
    }

    await channelRef.update({
      [`acl.${targetUid}`]: role,
      memberIds: FieldValue.arrayUnion(targetUid),
      updatedAt: FieldValue.serverTimestamp()
    });

    await db.collection("notifications").doc(targetUid).collection("items").add({
      type: "channel_shared",
      channelId: channelRef.id,
      byUid: uid,
      role,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({ ok: true });
  })
);

app.get(
  "/chat/:channelId/messages",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const channelRef = db.collection("channels").doc(req.params.channelId);
    const channelSnap = await channelRef.get();
    if (!channelSnap.exists) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const channel = channelSnap.data() as Record<string, unknown>;
    if (!canRead(channel, uid)) {
      res.status(403).json({ error: "No access to this channel" });
      return;
    }

    const inputLimit = Number.parseInt(asString(req.query.limit, "50"), 10);
    const itemLimit = Number.isFinite(inputLimit) ? Math.min(Math.max(inputLimit, 1), 100) : 50;

    const messagesSnap = await channelRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(itemLimit)
      .get();

    const messages = messagesSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .reverse();

    res.json({ items: messages });
  })
);

app.post(
  "/chat/:channelId/messages",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const text = asString(req.body?.text, "").trim();
    if (!text) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }

    const channelRef = db.collection("channels").doc(req.params.channelId);
    const channelSnap = await channelRef.get();
    if (!channelSnap.exists) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    const channel = channelSnap.data() as Record<string, unknown>;
    if (!canRead(channel, uid)) {
      res.status(403).json({ error: "No access to this channel" });
      return;
    }

    const messageRef = channelRef.collection("messages").doc();
    await messageRef.set({
      senderId: uid,
      text: text.slice(0, 4000),
      createdAt: FieldValue.serverTimestamp()
    });

    await channelRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: uid
    });

    res.status(201).json({ messageId: messageRef.id });
  })
);

app.post(
  "/files/create-upload",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const docId = asString(req.body?.docId, "").trim();
    const fileName = sanitizeFileName(asString(req.body?.fileName, ""));
    const mimeType = asString(req.body?.mimeType, "application/octet-stream");
    const size = Number(req.body?.size || 0);

    if (!docId || !fileName) {
      res.status(400).json({ error: "docId and fileName are required" });
      return;
    }

    if (!Number.isFinite(size) || size <= 0 || size > 10 * 1024 * 1024) {
      res.status(400).json({ error: "File size must be between 1B and 10MB" });
      return;
    }

    const docSnap = await db.collection("documents").doc(docId).get();
    if (!docSnap.exists) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const docData = docSnap.data() as Record<string, unknown>;
    if (!canWrite(docData, uid)) {
      res.status(403).json({ error: "No write access to this document" });
      return;
    }

    const fileRef = db.collection("files").doc();
    const storagePath = `uploads/${uid}/${fileRef.id}/${fileName}`;

    await fileRef.set({
      ownerId: uid,
      docId,
      fileName,
      mimeType,
      size,
      storagePath,
      status: "uploading",
      memberIds: docData.memberIds,
      acl: docData.acl,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).json({ fileId: fileRef.id, storagePath });
  })
);

app.post(
  "/files/:fileId/complete",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const fileRef = db.collection("files").doc(req.params.fileId);
    const fileSnap = await fileRef.get();
    if (!fileSnap.exists) {
      res.status(404).json({ error: "File metadata not found" });
      return;
    }

    const fileData = fileSnap.data() as Record<string, unknown>;
    if (asString(fileData.ownerId) !== uid) {
      res.status(403).json({ error: "Only uploader can finalize" });
      return;
    }

    await fileRef.update({
      status: "uploaded",
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({ ok: true });
  })
);

app.post(
  "/files/:fileId/share",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const targetUid = asString(req.body?.targetUid, "").trim();
    const role = asString(req.body?.role, "viewer") as Role;
    if (!targetUid) {
      res.status(400).json({ error: "targetUid is required" });
      return;
    }

    if (!["viewer", "editor", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const fileRef = db.collection("files").doc(req.params.fileId);
    const fileSnap = await fileRef.get();
    if (!fileSnap.exists) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const fileData = fileSnap.data() as Record<string, unknown>;
    const requesterRole = getAclRole(fileData, uid);
    if (requesterRole !== "owner" && requesterRole !== "admin") {
      res.status(403).json({ error: "Only owner/admin can share file" });
      return;
    }

    await fileRef.update({
      [`acl.${targetUid}`]: role,
      memberIds: FieldValue.arrayUnion(targetUid),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({ ok: true });
  })
);

app.get(
  "/files/:fileId/download-url",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const fileRef = db.collection("files").doc(req.params.fileId);
    const fileSnap = await fileRef.get();
    if (!fileSnap.exists) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const fileData = fileSnap.data() as Record<string, unknown>;
    if (!canRead(fileData, uid)) {
      res.status(403).json({ error: "No access to file" });
      return;
    }

    const storagePath = asString(fileData.storagePath);
    if (!storagePath) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }

    let signedUrl: string;
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.storage
        .from("uploads")
        .createSignedUrl(storagePath, 900);
      
      if (error || !data) {
        res.status(500).json({ error: error?.message || "Failed to create signed URL" });
        return;
      }
      signedUrl = data.signedUrl;
    } else {
      signedUrl = "";
    }

    res.json({ url: signedUrl });
  })
);

app.post(
  "/ai/summarize",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const docId = asString(req.body?.docId, "").trim();
    const directText = asString(req.body?.text, "").trim();

    let sourceText = directText;
    if (docId) {
      const docSnap = await db.collection("documents").doc(docId).get();
      if (!docSnap.exists) {
        res.status(404).json({ error: "Document not found" });
        return;
      }

      const docData = docSnap.data() as Record<string, unknown>;
      if (!canRead(docData, uid)) {
        res.status(403).json({ error: "No access to document" });
        return;
      }

      sourceText = asString(docData.content, "");
    }

    if (!sourceText) {
      res.status(400).json({ error: "Provide text or docId" });
      return;
    }

    if (sourceText.length > 20000) {
      sourceText = sourceText.slice(0, 20000);
    }

    const requestRef = db.collection("aiRequests").doc();
    await requestRef.set({
      ownerId: uid,
      docId: docId || null,
      type: "summarize",
      status: "running",
      promptLength: sourceText.length,
      createdAt: FieldValue.serverTimestamp()
    });

    const { text } = await callGemini(
      `Summarize this text in concise bullet points and include key action items:\n\n${sourceText}`
    );

    const outputRef = db.collection("aiOutputs").doc();
    await outputRef.set({
      ownerId: uid,
      requestId: requestRef.id,
      docId: docId || null,
      type: "summarize",
      content: text,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      createdAt: FieldValue.serverTimestamp()
    });

    await requestRef.update({
      status: "done",
      outputId: outputRef.id,
      completedAt: FieldValue.serverTimestamp()
    });

    res.json({ outputId: outputRef.id, content: text });
  })
);

app.post(
  "/ai/generate",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const prompt = asString(req.body?.prompt, "").trim();
    const docId = asString(req.body?.docId, "").trim();

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyAiCount = await db
      .collection("aiRequests")
      .where("ownerId", "==", uid)
      .where("createdAt", ">=", Timestamp.fromDate(dayStart))
      .count()
      .get();

    if ((dailyAiCount.data().count || 0) >= 50) {
      res.status(429).json({ error: "Daily AI limit reached (50)" });
      return;
    }

    let context = "";
    if (docId) {
      const docSnap = await db.collection("documents").doc(docId).get();
      if (!docSnap.exists) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      const docData = docSnap.data() as Record<string, unknown>;
      if (!canRead(docData, uid)) {
        res.status(403).json({ error: "No access to document" });
        return;
      }
      context = asString(docData.content, "").slice(0, 8000);
    }

    const requestRef = db.collection("aiRequests").doc();
    await requestRef.set({
      ownerId: uid,
      docId: docId || null,
      type: "generate",
      status: "running",
      prompt,
      createdAt: FieldValue.serverTimestamp()
    });

    const fullPrompt = context
      ? `Use the document context below when helpful.\n\nContext:\n${context}\n\nUser prompt:\n${prompt}`
      : prompt;

    const { text } = await callGemini(fullPrompt);

    const outputRef = db.collection("aiOutputs").doc();
    await outputRef.set({
      ownerId: uid,
      requestId: requestRef.id,
      docId: docId || null,
      type: "generate",
      content: text,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      createdAt: FieldValue.serverTimestamp()
    });

    await requestRef.update({
      status: "done",
      outputId: outputRef.id,
      completedAt: FieldValue.serverTimestamp()
    });

    res.json({ outputId: outputRef.id, content: text });
  })
);

app.get(
  "/admin/metrics",
  asyncHandler(async (req, res) => {
    const uid = req.user!.uid;
    const admin = await isAdmin(uid, req.user);
    if (!admin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [documents, channels, files, aiRequests, recentAi] = await Promise.all([
      db.collection("documents").count().get(),
      db.collection("channels").count().get(),
      db.collection("files").count().get(),
      db.collection("aiRequests").count().get(),
      db.collection("aiRequests").where("createdAt", ">=", sevenDaysAgo).count().get()
    ]);

    res.json({
      documents: documents.data().count || 0,
      channels: channels.data().count || 0,
      files: files.data().count || 0,
      aiRequests: aiRequests.data().count || 0,
      aiRequestsLast7Days: recentAi.data().count || 0
    });
  })
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown server error";
  logger.error("Unhandled API error", error);
  res.status(500).json({ error: message });
});

export const api = onRequest(
  {
    region: "us-east1",
    secrets: []
  },
  app
);

export const notifyOnNewMessage = onDocumentCreated(
  {
    document: "channels/{channelId}/messages/{messageId}",
    region: "us-east1"
  },
  async (event) => {
    const message = event.data?.data() as Record<string, unknown> | undefined;
    if (!message) {
      return;
    }

    const channelId = asString(event.params.channelId);
    const channelSnap = await db.collection("channels").doc(channelId).get();
    if (!channelSnap.exists) {
      return;
    }

    const channel = channelSnap.data() as Record<string, unknown>;
    const memberIds = Array.isArray(channel.memberIds)
      ? channel.memberIds.filter((value): value is string => typeof value === "string")
      : [];

    const senderId = asString(message.senderId);
    const recipients = memberIds.filter((memberId) => memberId !== senderId);

    if (!recipients.length) {
      return;
    }

    const recipientSnaps = await Promise.all(recipients.map((recipientUid) => db.collection("users").doc(recipientUid).get()));
    const tokens: string[] = [];

    for (const snap of recipientSnaps) {
      const userData = snap.data();
      const userTokens = userData?.fcmTokens;
      if (Array.isArray(userTokens)) {
        for (const token of userTokens) {
          if (typeof token === "string" && token.length > 0) {
            tokens.push(token);
          }
        }
      }
    }

    if (!tokens.length) {
      return;
    }

    const text = asString(message.text, "New message").slice(0, 140);
    await messaging.sendEachForMulticast({
      tokens: tokens.slice(0, 500),
      notification: {
        title: asString(channel.name, "Channel message"),
        body: text
      },
      data: {
        channelId
      }
    });
  }
);

export const onFileUploaded = {
  trigger: async () => {
    logger.warn("Supabase storage trigger removed - file status handled by client");
  }
};

export const rollupDailyMetrics = onSchedule(
  {
    schedule: "every 24 hours",
    region: "us-east1"
  },
  async () => {
  const [documents, channels, files, messages] = await Promise.all([
    db.collection("documents").count().get(),
    db.collection("channels").count().get(),
    db.collection("files").count().get(),
    db.collectionGroup("messages").count().get()
  ]);

  const dateKey = new Date().toISOString().slice(0, 10);
  await db.collection("adminMetrics").doc(dateKey).set({
    dateKey,
    documents: documents.data().count || 0,
    channels: channels.data().count || 0,
    files: files.data().count || 0,
    messages: messages.data().count || 0,
    generatedAt: FieldValue.serverTimestamp()
  });
});
