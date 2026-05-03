/**
 * Trade.model.js — Immutable execution record for every BUY and SELL
 *
 * Key design decisions:
 *  - avgBuyPrice : stored at trade time for SELL orders so realised P/L
 *    is always computable even after positions are fully closed
 *  - realisedPnL : pre-computed and stored; never recalculated from live data
 *  - All numeric fields use JS Number with 8dp precision enforced at the
 *    application layer via the decimal.js utility
 *
 * Fields:
 *   userId      — ref to User
 *   coin        — ticker in uppercase (e.g. "BTC")
 *   type        — "BUY" | "SELL"
 *   quantity    — units traded (> 0)
 *   price       — execution price per unit in USD
 *   totalValue  — quantity × price (computed at write time, stored for audits)
 *   avgBuyPrice — cost-basis at execution time:
 *                   BUY  → weighted avg after this buy
 *                   SELL → weighted avg before this sell (used for P/L calc)
 *   realisedPnL — only meaningful for SELL orders
 *                   = (price - avgBuyPrice) × quantity
 *                   null for BUY trades
 *   createdAt   — auto (immutable)
 */

import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    coin: {
      type:      String,
      required:  true,
      uppercase: true,
      trim:      true,
    },
    type: {
      type:     String,
      enum:     ["BUY", "SELL"],
      required: true,
    },
    quantity: {
      type:     Number,
      required: true,
      min:      [0.00000001, "Quantity must be positive"],
    },
    price: {
      type:     Number,
      required: true,
      min:      [0, "Price must be non-negative"],
    },
    totalValue: {
      type:     Number,
      required: true,
      min:      [0, "Total value must be non-negative"],
    },
    fee: {
      type:     Number,
      default:  0,
      min:      [0, "Fee must be non-negative"],
    },
    status: {
      type:     String,
      enum:     ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default:  "COMPLETED",
    },
    // Cost basis at the moment of execution — critical for accurate P/L
    avgBuyPrice: {
      type:    Number,
      default: null, // null means "not yet recorded" (legacy trades)
    },
    // Pre-computed realised P/L; null for BUY trades
    realisedPnL: {
      type:    Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
tradeSchema.index({ userId: 1, createdAt: -1 });  // trade history, newest first
tradeSchema.index({ userId: 1, coin: 1 });          // per-coin history
tradeSchema.index({ coin: 1 });                     // global coin analytics
tradeSchema.index({ userId: 1, type: 1 });          // filter BUY vs SELL

const Trade = mongoose.model("Trade", tradeSchema);

export default Trade;
