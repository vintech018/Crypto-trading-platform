/**
 * OHLC.model.js — Pre-aggregated candlestick data
 *
 * Candles are computed from executed trades (both market and limit).
 * Each document represents one candle for a (coin, interval) bucket.
 *
 * Intervals: "1m", "5m", "15m", "1h", "4h", "1d"
 *
 * The `openTime` field is the UTC timestamp of the START of the bucket
 * (e.g. for a 1h bucket starting at 14:00 UTC → openTime = 1700000400000).
 *
 * Pipeline:
 *   1. Trade is executed (market or limit fill)
 *   2. updateCandle() is called with (coin, price, qty, timestamp)
 *   3. We upsert into all 6 intervals simultaneously (atomic $set/$max/$min/$inc)
 */

import mongoose from "mongoose";

const VALID_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];

const ohlcSchema = new mongoose.Schema(
  {
    coin: {
      type:      String,
      required:  true,
      uppercase: true,
      trim:      true,
    },
    interval: {
      type:     String,
      enum:     VALID_INTERVALS,
      required: true,
    },
    // UTC ms timestamp of the bucket's open (floor of trade timestamp)
    openTime: {
      type:     Number,
      required: true,
    },
    open:   { type: Number, required: true },
    high:   { type: Number, required: true },
    low:    { type: Number, default: Infinity },
    close:  { type: Number, required: true },
    volume: { type: Number, default: 0 },      // sum of qty in this bucket
    trades: { type: Number, default: 0 },      // count of fills
  },
  {
    timestamps: false, // openTime IS the time dimension
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Primary query: "give me the last N 1h candles for BTC"
ohlcSchema.index({ coin: 1, interval: 1, openTime: -1 }, { unique: true });

export const OHLC = mongoose.model("OHLC", ohlcSchema);
export { VALID_INTERVALS };
