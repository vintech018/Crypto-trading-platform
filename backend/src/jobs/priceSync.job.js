/**
 * priceSync.job.js — Periodic price snapshot job
 *
 * Fetches live prices for all supported coins from CoinGecko
 * and persists them to the Price collection (MongoDB Atlas).
 *
 * Run this on a schedule (e.g. every 60 seconds via setInterval,
 * or via a cron job / BullMQ queue in production).
 *
 * Usage (from server.js or a scheduler):
 *   import { startPriceSyncJob } from "./jobs/priceSync.job.js";
 *   startPriceSyncJob();
 */

import { getPrices }      from "../services/price.service.js";
import { SUPPORTED_COINS } from "../utils/constants.js";
import logger              from "../utils/logger.js";

const INTERVAL_MS = 60_000; // 60 seconds

export function startPriceSyncJob() {
  logger.info(`[PriceSync] Starting — interval ${INTERVAL_MS / 1000}s`);

  // Run immediately on start, then on interval
  syncPrices();
  const timer = setInterval(syncPrices, INTERVAL_MS);
  timer.unref(); // don't block graceful shutdown

  return timer;
}

async function syncPrices() {
  try {
    const prices = await getPrices(SUPPORTED_COINS);
    const coins  = Object.entries(prices).filter(([, p]) => p > 0);
    logger.info(`[PriceSync] Updated ${coins.length}/${SUPPORTED_COINS.length} coins`);
  } catch (err) {
    logger.warn("[PriceSync] Failed", { error: err.message });
  }
}
