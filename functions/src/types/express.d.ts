declare namespace Express {
  interface Request {
    user?: import("firebase-admin/auth").DecodedIdToken;
  }
}
