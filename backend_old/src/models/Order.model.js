/**
 * Order.model.js — Limit order book schema
 *
 * Each document represents a single limit order placed by a user.
 *
 * Lifecycle:
 *   place()     → status: OPEN
 *   match()     → status: PARTIAL (partially filled) or FILLED (fully filled)
 *   cancel()    → status: CANCELLED
 *
 * Fields:
 *   userId         — ref to User
 *   coin           — ticker (e.g. "BTC")
 *   type           — "BUY" | "SELL"
 *   price          — limit price in USD per unit
 *   originalQty    — quantity originally requested
 *   remainingQty   — unfilled quantity (starts = originalQty, decrements on fills)
 *   filledQty      — cumulative filled quantity (originalQty - remainingQty)
 *   status         — OPEN | PARTIAL | FILLED | CANCELLED
 *   fills[]        — array of fill events (partial + final)
 *   createdAt      — auto timestamp
 *   updatedAt      — auto timestamp
 *
 * Indexes optimised for the matching engine's price-time-priority queue:
 *   BUY  side: sort by price DESC, createdAt ASC (highest bid first)
 *   SELL side: sort by price ASC,  createdAt ASC (lowest ask first)
 */

import mongoose from "mongoose";

const fillSchema = new mongoose.Schema(
  {
    // ID of the counterpart order that was matched
    matchedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    // ID of the Trade record created by this fill
    tradeId:   { type: mongoose.Schema.Types.ObjectId, ref: "Trade" },
    quantity:  { type: Number, required: true },
    price:     { type: Number, required: true },
    filledAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
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
    price: {
      type:     Number,
      required: true,
      min:      [0.000001, "Price must be positive"],
    },
    originalQty: {
      type:     Number,
      required: true,
      min:      [0.00000001, "Quantity must be positive"],
    },
    remainingQty: {
      type:     Number,
      required: true,
      min:      [0, "Remaining qty cannot be negative"],
    },
    filledQty: {
      type:    Number,
      default: 0,
      min:     [0],
    },
    status: {
      type:    String,
      enum:    ["OPEN", "PARTIAL", "FILLED", "CANCELLED"],
      default: "OPEN",
    },
    fills: [fillSchema],
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Primary query: "give me all OPEN/PARTIAL BUY orders for BTC, price DESC"
orderSchema.index({ coin: 1, type: 1, status: 1, price: -1, createdAt: 1 });
// User's own orders
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, coin: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
