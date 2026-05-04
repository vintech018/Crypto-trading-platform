/**
 * tokenStore.js — Redis-ready abstract token store
 *
 * This module provides a unified interface for storing short-lived tokens
 * (e.g. idempotency keys, OTPs, rate-limit counters).
 *
 * Default implementation: in-memory Map (zero dependencies, works out of the box).
 *
 * Redis migration path:
 *   1. Install ioredis: npm install ioredis
 *   2. Set REDIS_URL in .env
 *   3. Replace the `_inMemoryAdapter` below with `_redisAdapter`
 *   4. No other file needs to change — all consumers import from this module.
 *
 * Interface (all methods are async to be Redis-compatible):
 *   tokenStore.get(key)              → Promise<string|null>
 *   tokenStore.set(key, value, ttlMs) → Promise<void>
 *   tokenStore.del(key)              → Promise<void>
 *   tokenStore.has(key)              → Promise<boolean>
 *
 * ⚠️  This is a NEW module. It does NOT replace or modify refreshTokenStore.js
 *     or tokenBlacklist.js — those remain untouched.
 */

import logger from "./logger.js";

// ─── In-memory adapter (default) ─────────────────────────────────────────
const _map = new Map();

const _inMemoryAdapter = {
  async get(key) {
    const entry = _map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      _map.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key, value, ttlMs = 3_600_000) {
    _map.set(key, { value, expiresAt: Date.now() + ttlMs });
  },

  async del(key) {
    _map.delete(key);
  },

  async has(key) {
    return (await _inMemoryAdapter.get(key)) !== null;
  },

  /** Housekeeping — prune expired keys */
  _prune() {
    const now = Date.now();
    for (const [k, v] of _map) {
      if (now > v.expiresAt) _map.delete(k);
    }
  },

  /** For testing only */
  _size() { return _map.size; },
};

// Prune every 30 minutes
if (process.env.NODE_ENV !== "test") {
  setInterval(() => _inMemoryAdapter._prune(), 30 * 60 * 1000).unref();
}

// ─── Redis adapter stub (future) ─────────────────────────────────────────
// Uncomment and install ioredis to activate:
//
// import Redis from "ioredis";
// const _redis = new Redis(process.env.REDIS_URL);
//
// const _redisAdapter = {
//   async get(key)             { return _redis.get(key); },
//   async set(key, val, ttlMs) { await _redis.set(key, val, "PX", ttlMs); },
//   async del(key)             { await _redis.del(key); },
//   async has(key)             { return (await _redis.exists(key)) === 1; },
// };

// ─── Active adapter — swap here to switch backends ────────────────────────
const _adapter = _inMemoryAdapter;

logger.debug("tokenStore initialised", { backend: "in-memory" });

// ─── Public API ───────────────────────────────────────────────────────────
export const tokenStore = {
  /**
   * Retrieve a stored value. Returns null if key is absent or expired.
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  get: (key) => _adapter.get(key),

  /**
   * Store a value with an optional TTL (default 1 hour).
   * @param {string} key
   * @param {string} value
   * @param {number} [ttlMs=3_600_000]
   */
  set: (key, value, ttlMs) => _adapter.set(key, value, ttlMs),

  /**
   * Delete a key immediately.
   * @param {string} key
   */
  del: (key) => _adapter.del(key),

  /**
   * Check existence without reading the value.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  has: (key) => _adapter.has(key),
};
