/**
 * env.js — Centralized environment variable validation
 *
 * This module is imported FIRST in server.js (before app, before routes).
 * If any required variable is missing or malformed, the process exits
 * immediately with a clear error message — fail fast, not silently.
 *
 * All other modules should import from this file instead of
 * reading process.env directly.
 */

// ─── Required variables ────────────────────────────────────────
const REQUIRED = [
  "MONGO_URI",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
];

// ─── Validation ───────────────────────────────────────────────
const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n❌  STARTUP FAILED — Missing required environment variables:");
  missing.forEach((key) => console.error(`     • ${key}`));
  console.error("\n   Add them to your .env file and restart.\n");
  process.exit(1);
}

// ─── Specific validations ─────────────────────────────────────
// At least one of JWT_ACCESS_SECRET or JWT_SECRET must be present
const _accessSecret  = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const _refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!_accessSecret) {
  console.error("\n❌  STARTUP FAILED — JWT_ACCESS_SECRET (or JWT_SECRET) is required.");
  console.error("   Add it to your .env file and restart.\n");
  process.exit(1);
}

if (_accessSecret.length < 32) {
  console.error("\n❌  STARTUP FAILED — JWT_ACCESS_SECRET must be at least 32 characters.");
  console.error("   A short secret makes JWTs trivially brute-forceable.\n");
  process.exit(1);
}

if (!_refreshSecret || _refreshSecret.length < 32) {
  console.error("\n❌  STARTUP FAILED — JWT_REFRESH_SECRET must be at least 32 characters.");
  console.error("   Add a strong JWT_REFRESH_SECRET to your .env file and restart.\n");
  process.exit(1);
}

// ─── Typed, centralized env object ───────────────────────────
export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5050,
  IS_PROD: process.env.NODE_ENV === "production",

  // Database — MongoDB Atlas
  MONGO_URI: process.env.MONGO_URI,

  // CORS — comma-separated list e.g. "http://localhost:3000,https://app.solidus.io"
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Auth — access token (short-lived, used on every protected request)
  JWT_SECRET: _accessSecret,                                    // legacy compat alias
  JWT_ACCESS_SECRET: _accessSecret,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",

  // Auth — refresh token (long-lived, used ONLY to mint new access tokens)
  JWT_REFRESH_SECRET: _refreshSecret,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

  // Google OAuth 2.0
  GOOGLE_CLIENT_ID:     process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL:  process.env.GOOGLE_CALLBACK_URL,

  // Frontend URL (used for post-login redirect)
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // External APIs
  COINGECKO_API_URL: process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3",
  GNEWS_API_KEY: process.env.GNEWS_API_KEY,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // ─── Frontend / API URL ─────────────────────────────────────
  // Used by any server-side code that needs the canonical backend URL.
  // NEXT_PUBLIC_BACKEND_URL is the single source of truth (set in frontend .env).
  // Fallback chain: NEXT_PUBLIC_BACKEND_URL → BACKEND_URL → localhost default.
  // DO NOT remove either env var — both may be set in different environments.
  BACKEND_URL:
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5050",
});
