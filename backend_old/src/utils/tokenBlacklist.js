/**
 * tokenBlacklist.js — In-memory JWT blacklist
 *
 * Stores invalidated tokens until their natural expiry time.
 * Once a token's `exp` passes, it is pruned from the Set automatically
 * so memory does not grow unboundedly.
 *
 * Trade-off: this is process-local — if you run multiple instances or
 * restart the server, blacklisted tokens are cleared. For true
 * production multi-instance setups, replace the Set with a Redis
 * SETEX call (key = token, TTL = seconds until exp).
 *
 * Usage:
 *   import { blacklist } from "../utils/tokenBlacklist.js";
 *   blacklist.add(token, exp);      // on logout
 *   blacklist.has(token);           // in auth middleware
 */

import { redisClient } from "../config/redis.js";
import { env } from "../config/env.js";

const memoryBlacklist = new Set();

// ─── Public API ───────────────────────────────────────────────
export const blacklist = {
  /**
   * Blacklist a token until its expiry.
   * @param {string} token  — raw JWT string
   * @param {number} exp    — JWT `exp` claim (seconds since epoch)
   */
  async add(token, exp) {
    if (!env.IS_PROD) {
      memoryBlacklist.add(token);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;
    if (ttl > 0) {
      await redisClient.setex(`bl:${token}`, ttl, "1");
    }
  },

  /**
   * Returns true if the token has been blacklisted and not yet expired.
   * @param {string} token
   */
  async has(token) {
    if (!env.IS_PROD) {
      return memoryBlacklist.has(token);
    }
    const result = await redisClient.get(`bl:${token}`);
    return result !== null;
  },

  /** Exposed for testing only */
  async _size() {
    if (!env.IS_PROD) {
      return memoryBlacklist.size;
    }
    const keys = await redisClient.keys("bl:*");
    return keys.length;
  },
};
