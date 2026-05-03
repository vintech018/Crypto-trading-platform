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

// ─── Internal store ────────────────────────────────────────────
// Map<userId, { token, expiresAtMs }>
const store = new Map();

// ─── Prune expired entries ─────────────────────────────────────
// Runs every 30 minutes.  Keeps memory flat regardless of traffic.
const PRUNE_INTERVAL_MS = 30 * 60 * 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [userId, entry] of store) {
    if (entry.expiresAtMs <= now) store.delete(userId);
  }
}

if (process.env.NODE_ENV !== "test") {
  setInterval(pruneExpired, PRUNE_INTERVAL_MS).unref();
}

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
  save(userId, token, exp) {
    store.set(String(userId), {
      token,
      expiresAtMs: exp * 1000, // convert JWT exp (seconds) → ms
    });
  },

  /**
   * Returns true if the given token matches the stored token
   * for this user AND has not yet expired.
   *
   * @param {string|number} userId
   * @param {string}        token
   */
  isValid(userId, token) {
    const entry = store.get(String(userId));
    if (!entry)                          return false;
    if (entry.expiresAtMs <= Date.now()) { store.delete(String(userId)); return false; }
    return entry.token === token;
  },

  /**
   * Remove the stored refresh token for this user (logout).
   *
   * @param {string|number} userId
   */
  revoke(userId) {
    store.delete(String(userId));
  },

  /** Exposed for testing only */
  _size() { return store.size; },
};
