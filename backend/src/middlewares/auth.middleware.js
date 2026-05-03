/**
 * auth.middleware.js — JWT authentication guard
 *
 * Accepts the access token from:
 *   1. Authorization: Bearer <token>  header  (API clients / localStorage flow)
 *   2. solidus_access httpOnly cookie          (Google OAuth / cookie flow)
 *
 * Error codes:
 *   401 — No token provided (not authenticated)
 *   403 — Token present but invalid/expired/blacklisted (forbidden)
 *
 * Only accepts ACCESS tokens signed with JWT_ACCESS_SECRET.
 * Refresh tokens (signed with JWT_REFRESH_SECRET) are intentionally
 * rejected here — they must go through POST /api/auth/refresh.
 */

import jwt from "jsonwebtoken";
import { env }       from "../config/env.js";
import { AppError }  from "../utils/helpers.js";
import { blacklist } from "../utils/tokenBlacklist.js";

/**
 * Verifies the access token from either Bearer header or solidus_access cookie.
 *
 * On success: attaches decoded payload to req.user and raw token to req.token.
 *   req.user = { id, userId, email, iat, exp }
 *
 * On failure: passes an AppError to next().
 *   401 → no token at all
 *   403 → token present but invalid / expired / blacklisted
 */
export function authenticate(req, _res, next) {
  // ── 1. Extract token (Bearer header takes priority over cookie) ──
  let token = null;

  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies?.solidus_access) {
    token = req.cookies.solidus_access;
  }

  if (!token) {
    return next(new AppError("No authentication token provided. Please log in.", 401));
  }

  // ── 2. Blacklist check (O(1) Map lookup) ──────────────────────────
  // Run before jwt.verify() — no point doing crypto on a revoked token.
  if (blacklist.has(token)) {
    return next(new AppError("This session has been logged out. Please log in again.", 403));
  }

  // ── 3. Verify signature + expiry ──────────────────────────────────
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user  = decoded; // { id, userId, email, iat, exp }
    req.token = token;   // raw token stored so logout can blacklist it
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Session expired. Please refresh your token or log in again.", 403));
    }
    // Covers: JsonWebTokenError, NotBeforeError, and any other JWT errors
    return next(new AppError("Invalid authentication token. Access denied.", 403));
  }
}
