import type { NextFunction, Request, Response } from "express";
import { auth } from "./firebase";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization Bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = await auth.verifyIdToken(token);
    next();
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
