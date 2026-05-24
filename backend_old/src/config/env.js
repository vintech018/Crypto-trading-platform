/**
 * env.js — Centralized environment variable validation
 *
 * This module is imported FIRST in server.js (before app, before routes).
 * It enforces a strict FAIL-FAST policy: if any required variable is missing
 * or malformed, the process logs a clean error and exits immediately.
 */

// We don't import logger.js here because logger might depend on env.js.
// We'll use console to format a checklist before exiting.

const envConfig = process.env;
envConfig.PORT = envConfig.PORT || "5050";

// Helper to validate URLs
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Check if we are in test mode
const isTestMode = envConfig.NODE_ENV === "test";
const isDevMode = envConfig.NODE_ENV === "development";

// Define strict rules grouped logically
const REQUIRED_GROUPS = [
  {
    group: "Core App",
    vars: [
      { key: "PORT", validate: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0 },
      { key: "NODE_ENV", validate: (v) => ["development", "production", "test"].includes(v) },
      { key: "FRONTEND_URL", validate: (v) => isValidUrl(v) }
    ]
  },
  {
    group: "MongoDB",
    vars: [
      { key: "MONGO_URI", validate: (v) => v.startsWith("mongodb") }
    ]
  },
  {
    group: "JWT & Auth",
    vars: [
      { key: "JWT_ACCESS_SECRET", validate: (v) => v.length >= 32 },
      { key: "JWT_REFRESH_SECRET", validate: (v) => v.length >= 32 }
    ]
  },
  {
    group: "Google OAuth",
    vars: [
      { key: "GOOGLE_CLIENT_ID", validate: (v) => v.length > 0 },
      { key: "GOOGLE_CLIENT_SECRET", validate: (v) => v.length > 0 },
      { key: "GOOGLE_CALLBACK_URL", validate: (v) => isValidUrl(v) || v.startsWith("/") }
    ]
  },
  {
    group: "Cloudinary",
    vars: [
      { key: "CLOUDINARY_CLOUD_NAME", validate: (v) => v.length > 0 },
      { key: "CLOUDINARY_API_KEY", validate: (v) => v.length > 0 },
      { key: "CLOUDINARY_API_SECRET", validate: (v) => v.length > 0 }
    ]
  }
];

let hasErrors = false;
console.log("\n[Startup] Validating System Environment Configuration...\n");

for (const groupDef of REQUIRED_GROUPS) {
  let groupValid = true;
  for (const { key, validate } of groupDef.vars) {
    const value = envConfig[key] ? envConfig[key].trim() : "";
    
    if (!value) {
      console.error(`  ✗ [${groupDef.group}] Missing: ${key}`);
      groupValid = false;
      hasErrors = true;
    } else if (validate && !validate(value)) {
      console.error(`  ✗ [${groupDef.group}] Invalid format: ${key}`);
      groupValid = false;
      hasErrors = true;
    }
  }

  if (groupValid) {
    console.log(`  ✓ [${groupDef.group}] Config Loaded`);
  }
}

if (hasErrors) {
  console.error("\n❌ STARTUP FAILED — Critical infrastructure variables are missing or invalid.");
  console.error("Please update your .env file and try again.\n");
  process.exit(1);
}

console.log("\n✅ All environment configurations validated successfully.\n");

// ─── Export typed env object ───────────────────────────
export const env = Object.freeze({
  NODE_ENV: envConfig.NODE_ENV,
  PORT: parseInt(envConfig.PORT, 10),
  IS_PROD: envConfig.NODE_ENV === "production",

  // Core App
  FRONTEND_URL: envConfig.FRONTEND_URL,
  CORS_ORIGIN: envConfig.CORS_ORIGIN || envConfig.FRONTEND_URL,
  LOG_LEVEL: envConfig.LOG_LEVEL || "info",
  BACKEND_URL: envConfig.NEXT_PUBLIC_BACKEND_URL || envConfig.BACKEND_URL || `http://0.0.0.0:${envConfig.PORT}`,

  // Databases
  MONGO_URI: envConfig.MONGO_URI,
  DATABASE_URL: envConfig.DATABASE_URL,
  REDIS_URL: envConfig.REDIS_URL,

  // Auth & JWT
  JWT_ACCESS_SECRET: envConfig.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: envConfig.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: envConfig.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: envConfig.JWT_REFRESH_EXPIRES_IN || "7d",
  BCRYPT_SALT_ROUNDS: parseInt(envConfig.BCRYPT_SALT_ROUNDS, 10) || 12,

  // Google OAuth
  GOOGLE_CLIENT_ID: envConfig.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: envConfig.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: envConfig.GOOGLE_CALLBACK_URL,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: envConfig.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: envConfig.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: envConfig.CLOUDINARY_API_SECRET,

  // Stripe
  STRIPE_SECRET_KEY: envConfig.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: envConfig.STRIPE_WEBHOOK_SECRET,

  // Third-party API Defaults
  COINGECKO_API_URL: envConfig.COINGECKO_API_URL || "https://api.coingecko.com/api/v3",
  GNEWS_API_KEY: envConfig.GNEWS_API_KEY || "", // Optional
});
