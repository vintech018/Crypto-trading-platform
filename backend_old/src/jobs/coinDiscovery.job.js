/**
 * coinDiscovery.job.js — Coin metadata discovery (stub)
 *
 * In production this would refresh the SUPPORTED_COINS list from
 * CoinGecko's /coins/list endpoint and store any newly discovered
 * coins to a Coins collection.
 *
 * Currently a no-op stub — the coin list is managed statically in
 * src/utils/constants.js.  Extend here when dynamic discovery is needed.
 */

import logger from "../utils/logger.js";

export function startCoinDiscoveryJob() {
  logger.info("[CoinDiscovery] Static coin list in use — no discovery job running.");
  // Future: setInterval(() => discoverCoins(), 24 * 60 * 60 * 1000).unref();
}
