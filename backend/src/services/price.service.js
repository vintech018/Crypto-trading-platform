/**
 * price.service.js — Live market price fetcher
 *
 * Fetches current prices from CoinGecko's free API.
 * Results are cached in-process for 30 seconds to avoid
 * rate-limit issues on the free tier.
 *
 * DB layer: Mongoose (MongoDB Atlas) — Price model used as fallback store.
 */

import logger from "../utils/logger.js";
import { COINGECKO_ID_MAP } from "../utils/constants.js";
import Price from "../models/Price.model.js";

// ─── In-process price cache ───────────────────────────────────
const priceCache = new Map(); // coin → { price, expiresAt }
const CACHE_TTL_MS = 30_000;  // 30 seconds

// ─── Public API ───────────────────────────────────────────────

/**
 * Get the latest price for a single coin.
 * Tries cache first, then live API, then DB fallback.
 *
 * @param {string} coin  e.g. "BTC"
 * @returns {number}     Price in USD
 */
export async function getPrice(coin) {
  const cached = priceCache.get(coin);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.price;
  }

  try {
    const id = COINGECKO_ID_MAP[coin];
    if (!id) throw new Error(`No CoinGecko mapping for ${coin}`);

    const url = `${process.env.COINGECKO_API_URL}/simple/price?ids=${id}&vs_currencies=usd`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data  = await res.json();
    const price = data[id]?.usd;
    if (!price) throw new Error(`No price returned for ${id}`);

    // Cache result
    priceCache.set(coin, { price, expiresAt: Date.now() + CACHE_TTL_MS });

    // Persist snapshot to DB for historical reference (fire-and-forget)
    Price.create({ coin, price }).catch(() => {});

    return price;
  } catch (err) {
    logger.warn(`Live price fetch failed for ${coin}, falling back to DB`, { error: err.message });

    // Fallback — latest stored price
    const latest = await Price.findOne({ coin }).sort({ timestamp: -1 });
    if (latest) return latest.price;

    logger.error(`No price available for ${coin}`);
    return 0; // prevents hard crash; caller should handle 0
  }
}

/**
 * Get prices for multiple coins in one API call.
 * @param {string[]} coins
 * @returns {Record<string, number>}   { BTC: 65000, ETH: 3200, … }
 */
export async function getPrices(coins) {
  // Check which coins need a fresh fetch
  const toFetch = coins.filter((c) => {
    const cached = priceCache.get(c);
    return !cached || cached.expiresAt <= Date.now();
  });

  if (toFetch.length > 0) {
    try {
      const ids = toFetch.map((c) => COINGECKO_ID_MAP[c]).filter(Boolean).join(",");
      const url  = `${process.env.COINGECKO_API_URL}/simple/price?ids=${ids}&vs_currencies=usd`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const data = await res.json();

      // Update cache
      for (const coin of toFetch) {
        const id    = COINGECKO_ID_MAP[coin];
        const price = data[id]?.usd;
        if (price) {
          priceCache.set(coin, { price, expiresAt: Date.now() + CACHE_TTL_MS });
          Price.create({ coin, price }).catch(() => {}); // fire-and-forget
        }
      }
    } catch (err) {
      logger.warn("Batch price fetch failed", { error: err.message });
    }
  }

  // Build result — fallback to 0 for any coin without a cached price
  const result = {};
  for (const coin of coins) {
    const cached = priceCache.get(coin);
    result[coin] = cached ? cached.price : 0;
  }
  return result;
}
