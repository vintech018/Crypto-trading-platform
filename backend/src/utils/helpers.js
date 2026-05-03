/**
 * helpers.js — reusable utility functions
 */

// ─── Standardised API Responses ───────────────────────────────

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {any}    data
 */
export function sendSuccess(res, statusCode = 200, message = "Success", data = null) {
  const payload = { success: true, message };
  if (data !== null && data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
}

/**
 * Send an error response.
 */
export function sendError(res, statusCode = 500, message = "Internal Server Error", errors = null) {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

// ─── Custom Application Error ─────────────────────────────────

export class AppError extends Error {
  /**
   * @param {string} message   Human-readable message
   * @param {number} statusCode HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks controlled errors vs unexpected crashes
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Decimal Arithmetic Helpers ───────────────────────────────
// These are thin re-exports from decimal.js for backwards compatibility.
// All new code should import directly from ../utils/decimal.js.

export { weightedAvg as computeWeightedAvg, round } from "./decimal.js";
