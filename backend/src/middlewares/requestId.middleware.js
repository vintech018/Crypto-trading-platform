/**
 * requestId.middleware.js — Per-request unique tracing ID
 *
 * Attaches a UUID to every request using Node's built-in crypto
 * module (no external package needed). The ID is available as:
 *   - req.id              → usable in any downstream middleware / service
 *   - X-Request-Id header → visible to the frontend and API clients
 *
 * Why first in chain: every log line, error response, and DB query
 * can reference this ID, making distributed debugging trivial.
 */

import { randomUUID } from "crypto";

/**
 * Assigns a unique request ID and echoes it back in the response header.
 * If the caller already sends an X-Request-Id header, we respect it
 * (useful for end-to-end tracing from a frontend or API gateway).
 */
export function requestId(req, res, next) {
  // Honour an upstream trace ID if present, otherwise mint a fresh one.
  const id = req.headers["x-request-id"] || randomUUID();

  req.id = id;                         // available everywhere downstream
  res.setHeader("X-Request-Id", id);   // visible in browser DevTools / Postman

  next();
}
