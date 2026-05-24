/**
 * closePosition.service.js — Exit Trade (Close Position) service
 *
 * Closes an existing spot holding by:
 *   1. Fetching the current live market price for the coin
 *   2. Executing a full or partial SELL at that price (delegates to executeSell)
 *   3. Returning trade + wallet + realisedPnL for the controller to emit
 *
 * ⚠️  THIS MODULE IS PURELY ADDITIVE.
 *   - Does NOT modify executeBuy or executeSell.
 *   - Does NOT touch Trade, Holding, Wallet, or Ledger schemas.
 *   - Delegates all financial writes to executeSell() so all existing
 *     atomic-transaction, ledger, and OHLC logic is preserved.
 *
 * Idempotency:
 *   The underlying executeSell throws AppError("You don't hold any X", 400)
 *   if the holding is already gone — this naturally prevents double-close.
 *
 * @module closePosition.service
 */

import Holding    from "../models/Holding.model.js";
import { executeSell } from "./trade.service.js";
import { getPrice }    from "./price.service.js";
import { AppError }    from "../utils/helpers.js";
import { round }       from "../utils/decimal.js";
import logger          from "../utils/logger.js";

/**
 * Close (exit) a spot position for a user.
 *
 * @param {string} userId
 * @param {string} coin          — ticker e.g. "BTC"
 * @param {number|null} quantity — units to close; null = close full position
 * @returns {Promise<{
 *   trade: object,
 *   wallet: object,
 *   realisedPnL: number,
 *   exitPrice: number,
 *   coin: string,
 *   quantity: number
 * }>}
 */
export async function closePosition(userId, coin, quantity = null) {
  // ── 1. Load holding ──────────────────────────────────────────────────────
  const holding = await Holding.findOne({ userId, coin }).lean();

  if (!holding) {
    throw new AppError(`No open position for ${coin}. It may have already been closed.`, 400);
  }

  if (holding.quantity <= 0) {
    throw new AppError(`Position for ${coin} has zero quantity.`, 400);
  }

  // ── 2. Resolve quantity to close ─────────────────────────────────────────
  // If quantity is null/undefined → close the full position
  const qtyToClose = quantity != null
    ? Math.min(round(quantity, 8), holding.quantity)
    : holding.quantity;

  if (qtyToClose <= 0) {
    throw new AppError(`Quantity to close must be positive.`, 400);
  }

  // ── 3. Get live exit price ────────────────────────────────────────────────
  // Reuses price.service.js (cache + CoinGecko + DB fallback).
  // Falls back to avgBuyPrice if live price is unavailable (0) so we never
  // create a trade with price=0 which would corrupt the ledger.
  let exitPrice = await getPrice(coin);
  if (!exitPrice || exitPrice <= 0) {
    logger.warn(`[closePosition] Live price unavailable for ${coin} — using avgBuyPrice as fallback`, {
      userId,
      coin,
      avgBuyPrice: holding.avgBuyPrice,
    });
    exitPrice = holding.avgBuyPrice;
  }

  logger.info(`[closePosition] Closing ${qtyToClose} ${coin} @ $${exitPrice}`, {
    userId,
    coin,
    quantity: qtyToClose,
    exitPrice,
    avgBuyPrice: holding.avgBuyPrice,
  });

  // ── 4. Delegate to executeSell ────────────────────────────────────────────
  // All atomicity, ledger double-entry, OHLC, and session handling is handled
  // inside executeSell — we do NOT duplicate it here.
  const result = await executeSell(userId, coin, qtyToClose, exitPrice);

  return {
    trade:       result.trade,
    wallet:      result.wallet,
    realisedPnL: result.realisedPnL,
    exitPrice,
    coin,
    quantity:    qtyToClose,
  };
}
