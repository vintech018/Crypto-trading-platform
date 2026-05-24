/**
 * Holding.model.js — Aggregated open position per user per coin
 *
 * One document per (userId, coin) pair — enforced by compound unique index.
 *
 * Fields:
 *   userId       — ref to User
 *   coin         — ticker in uppercase (e.g. "BTC")
 *   quantity     — total units held (>= 0)
 *   avgBuyPrice  — weighted average cost basis in USD per unit
 *   totalCost    — quantity × avgBuyPrice; stored to avoid recomputing
 *                  and to detect rounding drift over many trades
 *   updatedAt    — auto timestamp (useful for stale holding detection)
 *
 * Derivation guarantee:
 *   avgBuyPrice = totalCost / quantity  (to 8dp precision)
 *
 * When quantity reaches 0 after a full SELL the document is DELETED,
 * not zeroed, to keep the collection clean. A zero holding is meaningless.
 */

import mongoose from "mongoose";

const holdingSchema = new mongoose.Schema(
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
    quantity: {
      type:    Number,
      required: true,
      min:     [0, "Quantity cannot be negative"],
    },
    avgBuyPrice: {
      type:     Number,
      required: true,
      min:      [0, "Avg buy price cannot be negative"],
    },
    // Redundant but fast: avoids recomputing avgBuyPrice when partially selling
    totalCost: {
      type:    Number,
      required: true,
      min:     [0, "Total cost cannot be negative"],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: "updatedAt" },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
holdingSchema.index({ userId: 1, coin: 1 }, { unique: true }); // primary lookup
holdingSchema.index({ userId: 1 });                             // list all holdings

const Holding = mongoose.model("Holding", holdingSchema);

export default Holding;
