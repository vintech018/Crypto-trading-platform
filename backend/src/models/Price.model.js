/**
 * Price.model.js — Mongoose schema for live/historical price snapshots
 *
 * Written by price.service.js after each successful CoinGecko fetch.
 * Used as a fallback when the live API is unavailable.
 */

import mongoose from "mongoose";

const priceSchema = new mongoose.Schema(
  {
    coin: {
      type:      String,
      required:  true,
      uppercase: true,
      trim:      true,
    },
    price: {
      type:     Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "timestamp", updatedAt: false },
  }
);

priceSchema.index({ coin: 1 });
priceSchema.index({ coin: 1, timestamp: -1 });

const Price = mongoose.model("Price", priceSchema);

export default Price;
