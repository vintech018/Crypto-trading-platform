/**
 * refreshTokenStore.js — In-memory refresh token store
 *
 * Stores one refresh token per user.  If the user logs in again
 * (without logging out first), the old token is silently replaced —
 * only the latest token is valid at any given time.
 *
 * Structure:
 *   store: Map<userId, { token: string, expiresAtMs: number }>
 *
 * Future upgrade path:
 *   Replace the Map with Redis HSET / GETEX calls:
 *     HSET  refresh:<userId>  token <token>
 *     EXPIREAT refresh:<userId>  <expiresAtMs / 1000>
 *
 * Usage:
 *   import { refreshTokenStore } from "../utils/refreshTokenStore.js";
 *   refreshTokenStore.save(userId, token, exp);   // on login / signup
 *   refreshTokenStore.verify(userId, token);       // on /refresh
 *   refreshTokenStore.revoke(userId);              // on logout
 */

import { redisClient } from "../config/redis.js";
import { env } from "../config/env.js";

const memoryStore = new Map();

// ─── Public API ────────────────────────────────────────────────
export const refreshTokenStore = {
  /**
   * Persist a refresh token for the given user.
   * Overwrites any previously stored token (single-session model).
   *
   * @param {string|number} userId
   * @param {string}        token  — raw refresh JWT string
   * @param {number}        exp    — JWT `exp` claim (seconds since epoch)
   */
  async save(userId, token, exp) {
    const key = `rt:${userId}`;
    if (!env.IS_PROD) {
      memoryStore.set(key, token);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;
    if (ttl > 0) {
      await redisClient.setex(key, ttl, token);
    }
  },

  /**
   * Returns true if the given token matches the stored token
   * for this user AND has not yet expired.
   *
   * @param {string|number} userId
   * @param {string}        token
   */
  async isValid(userId, token) {
    const key = `rt:${userId}`;
    if (!env.IS_PROD) {
      const storedToken = memoryStore.get(key);
      if (!storedToken) return false;
      return storedToken === token;
    }
    const storedToken = await redisClient.get(key);
    if (!storedToken) return false;
    return storedToken === token;
  },

  /**
   * Remove the stored refresh token for this user (logout).
   *
   * @param {string|number} userId
   */
  async revoke(userId) {
    const key = `rt:${userId}`;
    if (!env.IS_PROD) {
      memoryStore.delete(key);
      return;
    }
    await redisClient.del(key);
  },

  /** Exposed for testing only */
  async _size() {
    const keys = await redisClient.keys("rt:*");
    return keys.length;
  },
};
