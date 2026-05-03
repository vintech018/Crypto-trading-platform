/**
 * Wallet.model.js — Mongoose schema for the wallets collection
 *
 * One wallet per user (enforced by unique index on userId).
 * Balance stored as Number (float64) — precision maintained at
 * the application layer via toFixed(8) before writes.
 */

import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },
    balance: {
      type:    Number,
      default: 0,
      min:     [0, "Balance cannot be negative"],
    },
  },
  {
    timestamps: false,
  }
);

// Note: userId index is already created by `unique: true` on the field definition

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
