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

// ─── Internal store ───────────────────────────────────────────
// Map<token, expiresAtMs> — lets us prune without decoding again.
const store = new Map();

// ─── Prune expired entries ────────────────────────────────────
// Runs every 15 minutes. Keeps memory flat regardless of traffic.
const PRUNE_INTERVAL_MS = 15 * 60 * 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [token, expiresAt] of store) {
    if (expiresAt <= now) store.delete(token);
  }
}

// Only schedule in real runtime — not during test imports
if (process.env.NODE_ENV !== "test") {
  setInterval(pruneExpired, PRUNE_INTERVAL_MS).unref();
  // .unref() — prevents this timer from keeping the process alive
  // if it's the only thing left running (e.g. during graceful shutdown)
}

// ─── Public API ───────────────────────────────────────────────
export const blacklist = {
  /**
   * Blacklist a token until its expiry.
   * @param {string} token  — raw JWT string
   * @param {number} exp    — JWT `exp` claim (seconds since epoch)
   */
  add(token, exp) {
    store.set(token, exp * 1000); // convert JWT exp (seconds) → ms
  },

  /**
   * Returns true if the token has been blacklisted and not yet expired.
   * @param {string} token
   */
  has(token) {
    if (!store.has(token)) return false;
    // Double-check: if it's expired, treat as not blacklisted
    // (the pruner might not have run yet)
    if (store.get(token) <= Date.now()) {
      store.delete(token);
      return false;
    }
    return true;
  },

  /** Exposed for testing only */
  _size() { return store.size; },
};
