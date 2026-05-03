/**
 * ohlc.service.js — Candlestick candle management
 *
 * updateCandle() is called after every trade execution (market or limit fill).
 * It atomically upserts all 6 interval buckets in parallel.
 *
 * getCandles() serves the chart API.
 */

import { OHLC, VALID_INTERVALS } from "../models/OHLC.model.js";
import logger from "../utils/logger.js";

// Interval durations in milliseconds
const INTERVAL_MS = {
  "1m":  60_000,
  "5m":  300_000,
  "15m": 900_000,
  "1h":  3_600_000,
  "4h":  14_400_000,
  "1d":  86_400_000,
};

/**
 * Compute the bucket openTime for a given trade timestamp and interval.
 * e.g. for 1h: floor(tradeMs / 3_600_000) * 3_600_000
 */
function bucketOpenTime(tradeMs, interval) {
  const ms = INTERVAL_MS[interval];
  return Math.floor(tradeMs / ms) * ms;
}

/**
 * Called after every trade fill to update all OHLC intervals.
 * Uses MongoDB $set for open (only when the candle is first created),
 * $max for high, $min for low, and always overwrites close.
 *
 * @param {string} coin
 * @param {number} price  — execution price
 * @param {number} qty    — quantity traded
 * @param {number} tradeTs — trade timestamp in ms (Date.now())
 */
export async function updateCandle(coin, price, qty, tradeTs = Date.now()) {
  const updates = VALID_INTERVALS.map(interval => {
    const openTime = bucketOpenTime(tradeTs, interval);

    return OHLC.findOneAndUpdate(
      { coin, interval, openTime },
      [
        // Aggregation pipeline update (Mongo 4.2+): allows $cond for setOnInsert-like open
        {
          $set: {
            coin,
            interval,
            openTime,
            open:   { $ifNull: ["$open",  price] },  // set only on insert
            high:   { $max:   [{ $ifNull: ["$high",  price] }, price] },
            low:    { $min:   [{ $ifNull: ["$low",   price] }, price] },
            close:  price,                            // always latest
            volume: { $add:   [{ $ifNull: ["$volume", 0] }, qty] },
            trades: { $add:   [{ $ifNull: ["$trades", 0] }, 1] },
          },
        },
      ],
      { upsert: true, new: true }
    ).catch(err => {
      logger.warn(`OHLC upsert failed for ${coin}/${interval}`, { error: err.message });
    });
  });

  await Promise.all(updates);
}

/**
 * Fetch historical candles for a coin+interval.
 *
 * @param {string} coin
 * @param {string} interval   — one of VALID_INTERVALS
 * @param {number} limit      — number of candles (max 500)
 * @param {number} [before]   — return candles with openTime < before (pagination)
 * @returns {Array<{t,o,h,l,c,v}>} — compact chart format
 */
export async function getCandles(coin, interval, limit = 200, before = null) {
  if (!VALID_INTERVALS.includes(interval)) {
    throw new Error(`Invalid interval "${interval}". Must be one of: ${VALID_INTERVALS.join(", ")}`);
  }

  const cap    = Math.min(500, Math.max(1, parseInt(limit) || 200));
  const filter = { coin: coin.toUpperCase(), interval };
  if (before) filter.openTime = { $lt: Number(before) };

  const candles = await OHLC
    .find(filter)
    .sort({ openTime: -1 })
    .limit(cap)
    .lean();

  // Return in chronological order (oldest first) for charting libraries
  return candles.reverse().map(c => ({
    t: c.openTime,   // timestamp (ms)
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume,
    n: c.trades,     // number of trades in this candle
  }));
}
