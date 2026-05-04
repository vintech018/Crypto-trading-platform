/**
 * tradeRateLimiter.middleware.js — Rate limiter for trading APIs
 *
 * Applies ONLY to:
 *   /api/trade/*
 *   /api/orders (POST)
 *
 * Config:
 *   30 requests per minute per IP (sliding window)
 *   Returns clean JSON on rejection — no HTML, no plain-text
 *
 * Does NOT affect:
 *   /api/auth/*
 *   /api/wallet/*
 *   /api/reports/*
 *   Any other route
 *
 * Uses the same express-rate-limit package already installed in the project.
 * Key is namespaced with "trade_" prefix to avoid sharing state with authLimiter.
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function rateLimitHandler(req, res) {
  res.status(429).json({
    success: false,
    message: "Too many trading requests. Please slow down and try again shortly.",
    retryAfter: Math.ceil((req.rateLimit?.resetTime ?? Date.now()) / 1000),
  });
}

/**
 * tradeRateLimiter — 30 requests per 60 seconds per IP.
 *
 * Named export so spot.routes.js and order.routes.js can import it explicitly.
 * Keeps rate limiting scoped — does not bleed into auth or wallet routes.
 */
export const tradeRateLimiter = rateLimit({
  windowMs:        60 * 1000,    // 1 minute sliding window
  max:             30,           // 30 requests per window per IP
  standardHeaders: true,         // emit RateLimit-* headers (RFC 6585)
  legacyHeaders:   false,        // suppress deprecated X-RateLimit-* headers
  handler:         rateLimitHandler,

  // Namespace the key so it never collides with authLimiter or strictLimiter
  keyGenerator: (req) => `trade_${ipKeyGenerator(req)}`,
});
