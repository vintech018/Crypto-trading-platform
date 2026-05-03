/**
 * wallet.service.js — Wallet queries + ledger derivability
 *
 * Architecture note:
 * The wallet document's `balance` field is the cached/denormalized balance.
 * The AUTHORITATIVE source of truth is the ledger collection — the balance
 * should always equal:
 *
 *   Σ DEPOSIT  amounts (asset=USD)
 * + Σ SELL     amounts (asset=USD)
 * - Σ BUY      amounts (asset=USD)
 * - Σ WITHDRAW amounts (asset=USD)
 * - Σ FEE      amounts (asset=USD)
 *
 * This service exposes both the cached balance AND the derived balance
 * so discrepancies can be detected and alerted.
 */

import mongoose from "mongoose";
import Wallet  from "../models/Wallet.model.js";
import Ledger  from "../models/Ledger.model.js";
import { AppError } from "../utils/helpers.js";
import { D, round }  from "../utils/decimal.js";
import logger from "../utils/logger.js";

/** Cast a string userId to a Mongoose ObjectId for aggregation pipelines. */
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// ─── Balance (cached) ─────────────────────────────────────────────────────

/**
 * Return the wallet's cached balance (fast path — O(1)).
 */
export async function getWalletBalance(userId) {
  const wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) throw new AppError("Wallet not found.", 404);
  return {
    balance:   round(wallet.balance, 8),
    updatedAt: wallet.updatedAt ?? null,
  };
}

// ─── Derived Balance ──────────────────────────────────────────────────────

/**
 * Compute the wallet balance by replaying all USD ledger entries.
 * This is the audit/reconciliation path — more expensive but authoritative.
 *
 * Credits: DEPOSIT, SELL
 * Debits:  BUY, WITHDRAW, FEE
 */
export async function getDerivedBalance(userId) {
  // Aggregate: group by type, sum amounts where asset = "USD"
  const pipeline = [
    { $match: { userId: toObjectId(userId), asset: "USD" } },
    {
      $group: {
        _id:   "$type",
        total: { $sum: "$amount" },
      },
    },
  ];

  const rows = await Ledger.aggregate(pipeline);

  const totals = { DEPOSIT: 0, SELL: 0, BUY: 0, WITHDRAW: 0, FEE: 0 };
  for (const r of rows) {
    if (totals[r._id] !== undefined) totals[r._id] = r.total;
  }

  const derived = D(totals.DEPOSIT)
    .plus(D(totals.SELL))
    .minus(D(totals.BUY))
    .minus(D(totals.WITHDRAW))
    .minus(D(totals.FEE))
    .toNumber();

  return { derivedBalance: round(derived, 8), breakdown: totals };
}

// ─── Audit / Reconciliation ───────────────────────────────────────────────

/**
 * Compare cached wallet balance against ledger-derived balance.
 * Logs a critical warning if they diverge by more than $0.01.
 *
 * @returns {{ cached, derived, drift, ok }}
 */
export async function auditBalance(userId) {
  const [{ balance: cached }, { derivedBalance: derived }] = await Promise.all([
    getWalletBalance(userId),
    getDerivedBalance(userId),
  ]);

  const drift = Math.abs(D(cached).minus(D(derived)).toNumber());
  const ok    = drift < 0.01; // tolerance: 1 cent

  if (!ok) {
    logger.error("BALANCE DRIFT DETECTED", { userId, cached, derived, drift });
  }

  return { cached, derived, drift: round(drift, 8), ok };
}

// ─── Ledger History ───────────────────────────────────────────────────────

/**
 * Paginated ledger for a user with optional filters.
 *
 * @param {string}  userId
 * @param {object}  opts
 * @param {number}  opts.page     — 1-indexed page (default 1)
 * @param {number}  opts.limit    — entries per page (default 20, max 100)
 * @param {string}  opts.type     — optional filter: DEPOSIT | BUY | SELL | WITHDRAW | FEE
 * @param {string}  opts.asset    — optional filter: USD | BTC | ...
 * @param {string}  opts.from     — ISO date, filter createdAt >= from
 * @param {string}  opts.to       — ISO date, filter createdAt <= to
 */
export async function getLedger(userId, opts = {}) {
  const page  = Math.max(1, parseInt(opts.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(opts.limit) || 20));
  const skip  = (page - 1) * limit;

  // Build match filter
  const match = { userId };
  if (opts.type  && ["DEPOSIT","BUY","SELL","WITHDRAW","FEE"].includes(opts.type.toUpperCase())) {
    match.type = opts.type.toUpperCase();
  }
  if (opts.asset) {
    match.asset = opts.asset.toUpperCase();
  }
  if (opts.from || opts.to) {
    match.createdAt = {};
    if (opts.from) match.createdAt.$gte = new Date(opts.from);
    if (opts.to) {
      const to = new Date(opts.to);
      to.setUTCHours(23, 59, 59, 999);
      match.createdAt.$lte = to;
    }
  }

  const [total, entries] = await Promise.all([
    Ledger.countDocuments(match),
    Ledger.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    entries: entries.map(serializeLedger),
  };
}

// ─── Serializers ──────────────────────────────────────────────────────────

function serializeLedger(e) {
  return {
    id:            e._id,
    type:          e.type,
    amount:        e.amount,
    asset:         e.asset,
    balanceBefore: e.balanceBefore,
    balanceAfter:  e.balanceAfter,
    referenceId:   e.referenceId,
    note:          e.note,
    createdAt:     e.createdAt,
  };
}
