/**
 * db.js — MongoDB Atlas connection via Mongoose
 *
 * Exports connectDB() — call this once at server startup.
 * If Atlas is unreachable, the server still boots and retries every 5 s.
 */

import mongoose from "mongoose";
import dns      from "dns";
import logger   from "../utils/logger.js";

// ─── Force public DNS servers ────────────────────────────────────────────────
// The local router's DNS often fails MongoDB Atlas SRV record lookups.
// Setting Google + Cloudflare DNS fixes querySrv ECONNREFUSED errors.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

let isConnected = false;
let retryTimer  = null;


export async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error("❌  MONGO_URI is not defined. Add it to your .env file.");
    process.exit(1);
  }

  await _attempt(uri);
}

async function _attempt(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS:          45_000,
    });

    isConnected = true;
    if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }
    logger.info("✅  MongoDB connected to Atlas");

    // Graceful shutdown hooks (register only once)
    process.once("SIGINT",  () => gracefulClose("SIGINT"));
    process.once("SIGTERM", () => gracefulClose("SIGTERM"));

  } catch (err) {
    logger.error("❌  MongoDB connection failed — will retry in 5 s", { message: err.message });
    if (!retryTimer) {
      retryTimer = setInterval(() => _attempt(uri), 5_000);
    }
  }
}

async function gracefulClose(signal) {
  logger.info(`${signal} received — closing MongoDB connection…`);
  await mongoose.connection.close();
  logger.info("MongoDB disconnected. Bye 👋");
  process.exit(0);
}

