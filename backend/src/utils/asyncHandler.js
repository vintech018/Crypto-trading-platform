/**
 * asyncHandler.js — Graceful async error wrapper
 *
 * Usage:
 *   import { asyncHandler } from "../utils/asyncHandler.js";
 *   router.post("/", asyncHandler(async (req, res) => { ... }));
 *
 * Why this exists:
 *   Express 4 does NOT automatically catch promise rejections from async
 *   route handlers. Without this wrapper, an unhandled rejection silently
 *   hangs the request.
 *
 * What it does:
 *   Wraps `fn` in a try/catch and forwards any thrown error to next(),
 *   which routes it to the centralized error handler in error.middleware.js.
 *
 * ⚠️  Apply ONLY to NEW routes and middleware added going forward.
 *     Do NOT retrofit existing handlers — this must remain additive.
 *
 * @param {Function} fn  An async Express route handler (req, res, next) => Promise
 * @returns {Function}   A regular Express handler that never leaks rejections
 */
export function asyncHandler(fn) {
  return function asyncHandlerWrapper(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
