/**
 * error.middleware.js — global error handler
 *
 * Must be registered LAST in Express (after all routes).
 * Catches both operational AppErrors and unexpected crashes.
 *
 * Handles both MongoDB/Mongoose errors and our own AppError class.
 */

import logger from "../utils/logger.js";
import { AppError } from "../utils/helpers.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {

  // ── Mongoose duplicate key (e.g. unique email) ──────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
      field,
    });
  }

  // ── Mongoose validation errors ───────────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(" "),
    });
  }

  // ── Mongoose CastError (bad ObjectId) ───────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for field "${err.path}".`,
    });
  }

  // ── Prisma error codes — kept for safety during transition ───
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
      field: err.meta?.target,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ success: false, message: "Record not found." });
  }

  // ── Our own operational errors ───────────────────────────────
  if (err instanceof AppError && err.isOperational) {
    logger.warn(`[Operational] ${err.message}`, { statusCode: err.statusCode });
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // ── Unexpected / programmer errors — log full stack ──────────
  logger.error("Unhandled error", { message: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message,
  });
}

// 404 handler — put before errorHandler in app.js
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}
