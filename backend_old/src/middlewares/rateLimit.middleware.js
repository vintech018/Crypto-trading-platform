/**
 * rateLimit.middleware.js — Route-specific rate limiters
 *
 * Uses express-rate-limit. Each limiter is a named export so routes
 * can apply only what they need. No global limit is set — that would
 * break health checks, WebSocket upgrades, and static assets.
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis.js";
import { env } from "../config/env.js";

// ─── Shared handler ───────────────────────────────────────────
// Returns a clean JSON error instead of the default plain-text response.
function rateLimitHandler(req, res) {
  res.status(429).json({
    success: false,
    message: "Too many requests from this IP. Please try again later.",
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),  // seconds until reset
  });
}

// ─── Auth limiter ─────────────────────────────────────────────
// Applied to: POST /api/auth/login  and  POST /api/auth/signup
// Blocks brute-force credential stuffing attacks.
// 10 attempts per 15 minutes per IP.
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              10,               // max requests per window per IP
  standardHeaders:  true,            // send RateLimit-* headers (RFC 6585)
  legacyHeaders:    false,           // don't send deprecated X-RateLimit-* headers
  handler:          rateLimitHandler,
  store:            (env.IS_PROD && process.env.REDIS_URL) ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:auth:"
  }) : undefined,

  // ipKeyGenerator handles IPv4-mapped IPv6 addresses correctly (::ffff:x.x.x.x)
  keyGenerator: (req) => ipKeyGenerator(req),
});

// ─── Strict limiter (for sensitive ops) ──────────────────────
// Applied to: password reset, OTP requests — anything high-risk.
// 5 attempts per 60 minutes per IP.
export const strictLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,  // 1 hour
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  store:            (env.IS_PROD && process.env.REDIS_URL) ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:strict:"
  }) : undefined,
  keyGenerator:     (req) => ipKeyGenerator(req),
});

// ─── Upload limiter (for media and KYC) ───────────────────────
// Applied to: POST /api/uploads/avatar, POST /api/uploads/kyc
// 20 attempts per hour per IP.
export const uploadLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,  // 1 hour
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  store:            (env.IS_PROD && process.env.REDIS_URL) ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:upload:"
  }) : undefined,
  keyGenerator:     (req) => ipKeyGenerator(req),
});
