/**
 * idempotency.middleware.js — Idempotency layer for trade/order endpoints
 *
 * How it works:
 *   1. Client sends a unique `Idempotency-Key` header with each POST request.
 *   2. On first request: execute normally, cache the response keyed by
 *      (userId + idempotency-key). TTL = 24 hours.
 *   3. On duplicate request (same key): return the cached response immediately
 *      WITHOUT re-executing business logic.
 *
 * Apply ONLY to:
 *   POST /api/trade/*
 *   POST /api/orders
 *
 * Default store: in-memory Map (Redis-ready — swap store adapter below).
 *
 * ⚠️  STRICT RULES:
 *   - Does NOT touch any existing route handlers or controllers.
 *   - Does NOT modify req/res format — cached response mirrors original.
 *   - Does NOT log tokens or sensitive body fields.
 */

import logger from "../utils/logger.js";

// ─── In-memory store (Redis-ready abstraction) ────────────────────────────
// To migrate to Redis, replace this object with ioredis calls:
//   await redis.set(key, value, "EX", TTL_SECONDS);
//   await redis.get(key);
//   await redis.del(key);
const _store = new Map();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const idempotencyStore = {
  async get(key) {
    const entry = _store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      _store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key, value) {
    _store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  },

  /** For testing / inspection only */
  _size() { return _store.size; },
};

// ─── Prune stale entries every hour ──────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _store) {
      if (now > v.expiresAt) _store.delete(k);
    }
  }, 60 * 60 * 1000).unref();
}

// ─── Middleware ────────────────────────────────────────────────────────────
/**
 * Intercept duplicate POST requests using the `Idempotency-Key` header.
 *
 * If the key is absent — the request proceeds normally (non-idempotent path).
 * If the key is present and seen before — return the cached response.
 * If the key is new — execute the handler and cache the response before sending.
 *
 * Cache key format: `<userId>:<idempotency-key>`
 * Using userId ensures key namespacing per user (no cross-user collision).
 *
 * @requires authenticate middleware to run first (req.user must be set)
 */
export function idempotency(req, res, next) {
  const idempKey = req.headers["idempotency-key"];

  // No key provided → pass through unchanged
  if (!idempKey) return next();

  // Scope key per authenticated user (req.user set by authenticate middleware)
  const userId  = req.user?.id ?? "anon";
  const storeKey = `${userId}:${idempKey}`;

  // Check cache asynchronously
  idempotencyStore.get(storeKey).then((cached) => {
    if (cached) {
      // ── Duplicate request — return cached response ──────────────────────
      logger.info("Idempotency hit — returning cached response", {
        idempotencyKey: idempKey,
        userId,
        path: req.path,
        method: req.method,
      });

      res.setHeader("X-Idempotency-Replayed", "true");
      return res.status(cached.statusCode).json(cached.body);
    }

    // ── First request — intercept json() to capture the response ──────────
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Cache only successful (2xx) responses to avoid caching transient errors
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyStore.set(storeKey, {
          statusCode: res.statusCode,
          body,
        }).catch((err) => {
          logger.warn("Idempotency cache write failed", { error: err.message });
        });
      }

      // Restore and call original json()
      res.json = originalJson;
      return originalJson(body);
    };

    next();
  }).catch((err) => {
    // Cache read failure is non-fatal — proceed without idempotency
    logger.warn("Idempotency cache read failed — proceeding without cache", {
      error: err.message,
    });
    next();
  });
}
