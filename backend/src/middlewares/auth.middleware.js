import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing Authorization Bearer token" });

  try {
    const payload = verifyToken(token);
    if (payload.typ !== "access") return res.status(401).json({ message: "Invalid token type" });
    req.auth = { userId: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}


