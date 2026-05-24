/**
 * client.js — Prisma Client singleton for PostgreSQL analytics layer
 *
 * ⚠️  ARCHITECTURE NOTE:
 *     This is the SECONDARY database connection.
 *     MongoDB Atlas (via Mongoose in /config/db.js) remains PRIMARY.
 *     This file is ISOLATED — it has zero imports from any existing
 *     Mongoose models, services, controllers, or middleware.
 *
 * Usage:
 *   import { prisma } from "../postgres/client.js";
 *
 * Graceful behavior:
 *   - If DATABASE_URL is missing, prisma is exported as null.
 *   - Callers must check `if (!prisma) return;` before use.
 *   - This ensures server startup is NEVER blocked by missing PG config.
 */

import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

// ─── Singleton instance (standard Prisma pattern) ──────────────────────────
let prisma = null;

if (process.env.DATABASE_URL) {
  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
    });
    logger.info("[PostgreSQL] Prisma client initialized for analytics layer.");
  } catch (err) {
    logger.error("[PostgreSQL] Prisma client failed to initialize.", { message: err.message });
    prisma = null;
  }
} else {
  logger.info("[PostgreSQL] DATABASE_URL not set. Analytics layer disabled.");
}

// ─── Graceful shutdown hook ─────────────────────────────────────────────────
// Disconnects Prisma cleanly on server shutdown.
// Does not interfere with Mongoose disconnection hooks in db.js.
if (prisma) {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export { prisma };
