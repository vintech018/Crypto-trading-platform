/**
 * server.js — Entry point
 *
 * ⚠️  ESM import hoisting means static imports are evaluated BEFORE
 *     the module body runs.  We solve this by importing dotenv via
 *     a side-effect import FIRST — Node resolves side-effect imports
 *     in source order before other named imports from the same file.
 *
 * DB: MongoDB Atlas via Mongoose (connectDB)
 */

// ── Step 1: Load .env BEFORE anything else ──────────────────────
// Using the dotenv/config side-effect import is the correct ESM pattern.
// It runs synchronously and populates process.env before any other
// module in this file is evaluated.
import "dotenv/config";

// ── Step 2: Validate env vars (will crash if any are missing) ───
import { env } from "./config/env.js";

// ── Step 3: Application modules ─────────────────────────────────
import app            from "./app.js";
import logger         from "./utils/logger.js";
import { connectDB }  from "./config/db.js";
import { startNewsCronJob } from "./jobs/news.job.js";
import { initWebSocket } from "./websocket.js";
import { startPortfolioSnapshotJob } from "./jobs/portfolioSnapshot.job.js";
import { startAnalyticsWorker, stopAnalyticsWorker } from "./jobs/analyticsWorker.js";

// ─── Port Conflict Detection ──────────────────────────────────
const DESIRED_PORT = env.PORT;

/**
 * Try to listen on a port. If EADDRINUSE, try the next port.
 * Attempts up to 10 consecutive ports before giving up.
 */
function startServer(port, attempt = 0) {
  const MAX_ATTEMPTS = env.IS_PROD ? 1 : 10;

  const server = app.listen(port, "0.0.0.0", () => {
    if (port !== DESIRED_PORT) {
      logger.warn(
        `⚠️  Port ${DESIRED_PORT} was busy. SOLIDUS API started on fallback port ${port}.`
      );
      logger.warn(
        `   Update PORT=${port} in .env or kill the process using port ${DESIRED_PORT}.`
      );
    } else {
      logger.info(`✅ SOLIDUS API running on port ${port} (0.0.0.0)`);
    }
    logger.info(`   Environment : ${env.NODE_ENV}`);
    logger.info(`   CORS origins : ${env.CORS_ORIGIN}`);
    
    // Initialize WebSocket Server
    initWebSocket(server);
    logger.info(`✅ WebSocket (Socket.IO) server started.`);

    // Start analytics cron jobs
    startPortfolioSnapshotJob();
    logger.info("✅ Portfolio snapshot cron job started (daily at midnight UTC).");

    // Start analytics background worker
    startAnalyticsWorker();
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (attempt >= MAX_ATTEMPTS) {
        logger.error(
          `❌ Could not bind to port ${port} after ${MAX_ATTEMPTS} attempts. Exiting.`
        );
        process.exit(1);
      }
      logger.warn(`Port ${port} is already in use. Retrying in 1s (attempt ${attempt + 1}/${MAX_ATTEMPTS})…`);
      setTimeout(() => startServer(port, attempt + 1), 1000);
    } else {
      logger.error("Server error", { message: err.message });
      process.exit(1);
    }
  });

  // ─── Graceful Shutdown ────────────────────────────────────────
  // MongoDB disconnect hooks are registered inside connectDB().
  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down Express…`);
    await stopAnalyticsWorker();
    
    // Close websockets
    const { getIO } = await import("./websocket.js");
    try {
      getIO().close();
    } catch(e) {}

    // Close Redis
    const { redisClient, redisPubClient, redisSubClient } = await import("./config/redis.js");
    try {
      await redisClient.quit();
      await redisPubClient.quit();
      await redisSubClient.quit();
    } catch(e) {}

    server.close(() => {
      logger.info("HTTP server closed. Bye 👋");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

// Catch unhandled promise rejections globally
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", { reason });
});

// ─── Boot sequence: Start server immediately, let DB connect in background ─────
(async () => {
  // Start server immediately so Railway healthchecks pass
  startServer(DESIRED_PORT);

  import("mongoose").then(({ default: mongoose }) => {
    mongoose.connection.once("open", () => {
      logger.info("MongoDB Connection Open.");
      // Temporarily disabled news cron job for stability
      // startNewsCronJob();
    });
  });

  // Fire DB connection — it will retry automatically if Atlas is unreachable.
  connectDB().catch(() => {});
})();
