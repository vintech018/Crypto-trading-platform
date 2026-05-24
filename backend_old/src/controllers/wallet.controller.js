/**
 * wallet.controller.js — Wallet, Ledger & Audit HTTP handlers
 */

import * as walletService from "../services/wallet.service.js";
import { sendSuccess }    from "../utils/helpers.js";

/**
 * GET /api/wallet/balance
 */
export async function getBalance(req, res, next) {
  try {
    const data = await walletService.getWalletBalance(req.user.id);
    return sendSuccess(res, 200, "Wallet balance fetched.", data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wallet/ledger
 *
 * Query params (all optional):
 *   page   — 1-indexed page number (default 1)
 *   limit  — entries per page (default 20, max 100)
 *   type   — DEPOSIT | BUY | SELL | WITHDRAW | FEE
 *   asset  — USD | BTC | ETH | ...
 *   from   — ISO date (inclusive lower bound)
 *   to     — ISO date (inclusive upper bound, clamped to 23:59:59)
 */
export async function getLedger(req, res, next) {
  try {
    const { page, limit, type, asset, from, to } = req.query;
    const data = await walletService.getLedger(req.user.id, {
      page, limit, type, asset, from, to,
    });
    return sendSuccess(res, 200, "Ledger fetched.", data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wallet/audit
 * ⚠️  Expensive — replays full ledger. Use sparingly.
 * Compares cached wallet balance vs ledger-derived balance.
 * Returns a drift value — should always be < $0.01.
 */
export async function auditBalance(req, res, next) {
  try {
    const data = await walletService.auditBalance(req.user.id);
    return sendSuccess(res, 200, data.ok ? "Balance reconciled." : "⚠️ Balance drift detected.", data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wallet/derived-balance
 * Returns the balance derived from replaying all ledger entries.
 */
export async function getDerivedBalance(req, res, next) {
  try {
    const data = await walletService.getDerivedBalance(req.user.id);
    return sendSuccess(res, 200, "Derived balance computed.", data);
  } catch (err) {
    next(err);
  }
}
