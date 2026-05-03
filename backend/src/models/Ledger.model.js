/**
 * Ledger.model.js — Immutable double-entry financial audit trail
 *
 * Every USD balance change and asset movement is recorded here.
 * The wallet balance is DERIVED from this collection via:
 *
 *   balance = Σ(DEPOSIT amounts)
 *           + Σ(SELL   amounts where asset = "USD")
 *           - Σ(BUY    amounts where asset = "USD")
 *           - Σ(WITHDRAW amounts)
 *
 * Fields:
 *   userId      — ref to User
 *   type        — DEPOSIT | BUY | SELL | WITHDRAW | FEE
 *   amount      — always positive; direction implied by type (Number, 8dp precision)
 *   asset       — "USD" for fiat flows; coin ticker for asset entries (e.g. "BTC")
 *   balanceBefore  — USD wallet balance immediately before this event
 *   balanceAfter   — USD wallet balance immediately after (derivability check)
 *   referenceId — ObjectId of the Trade document (nullable)
 *   note        — optional human-readable memo
 *   createdAt   — auto timestamp (immutable; no updatedAt)
 *
 * IMMUTABILITY: No update or delete is ever performed on ledger documents.
 * All corrections are made via compensating entries.
 */

import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    type: {
      type:     String,
      enum:     ["DEPOSIT", "BUY", "SELL", "WITHDRAW", "FEE"],
      required: true,
    },
    // Amount is always a positive number; direction is encoded in `type`
    amount: {
      type:     Number,
      required: true,
      min:      [0, "Amount must be non-negative"],
    },
    // "USD" for fiat flows; coin ticker (e.g. "BTC") for asset flows
    asset: {
      type:     String,
      required: true,
      uppercase: true,
      trim:      true,
    },
    // Wallet snapshot for immediate auditability (USD only)
    balanceBefore: {
      type:    Number,
      default: null,
    },
    balanceAfter: {
      type:    Number,
      default: null,
    },
    // Pointer to the trade that caused this entry (nullable)
    referenceId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Trade",
      default: null,
    },
    // Optional memo for manual/special entries
    note: {
      type:    String,
      default: null,
      trim:    true,
    },
  },
  {
    // Only createdAt — ledger entries are immutable
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Primary query pattern: all entries for a user, newest first
ledgerSchema.index({ userId: 1, createdAt: -1 });
// Filter by type (e.g. fetch all DEPOSITs for a user)
ledgerSchema.index({ userId: 1, type: 1, createdAt: -1 });
// Lookup by trade reference
ledgerSchema.index({ referenceId: 1 }, { sparse: true });

const Ledger = mongoose.model("Ledger", ledgerSchema);

export default Ledger;
