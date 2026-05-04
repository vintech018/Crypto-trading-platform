/**
 * reservation.service.js — Fund Reservation Skeleton (SAFE MODE)
 *
 * ⚠️  THIS MODULE IS PURELY ADDITIVE AND NON-ENFORCING.
 *
 * Current behavior:
 *   All functions LOG their intent and return immediately.
 *   No funds are locked, deducted, or blocked.
 *   The current executeBuy / executeSell flow is completely unchanged.
 *
 * Future behavior (when enforcement is ready):
 *   1. reserve()   — deduct funds from available balance into a "reserved" ledger.
 *   2. release()   — return reserved funds on cancel / failure.
 *   3. settle()    — finalize reservation after successful execution.
 *
 * To activate: replace the log-only stubs below with real Wallet/Ledger writes.
 * Ensure executeBuy / executeSell call reserve() BEFORE writing the trade,
 * and settle() AFTER. Until then, nothing here is enforced.
 *
 * DO NOT MODIFY: executeBuy, executeSell, trade.service.js, order.service.js
 */

import logger from "../utils/logger.js";

const SAFE_MODE_MSG = "Reservation system not yet enforced";

/**
 * Reserve funds for a pending trade/order.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.coin
 * @param {number} params.quantity
 * @param {number} params.price
 * @param {string} params.type   "BUY" | "SELL"
 * @returns {Promise<{ reserved: false, reason: string }>}
 */
export async function reserve({ userId, coin, quantity, price, type }) {
  logger.info(`[reservation] ${SAFE_MODE_MSG}`, {
    action: "reserve",
    userId,
    coin,
    quantity,
    price,
    type,
  });

  // Future: deduct from wallet balance into reserved ledger
  // const totalCost = quantity * price;
  // await Wallet.findOneAndUpdate(
  //   { userId, balance: { $gte: totalCost } },
  //   { $inc: { balance: -totalCost, reserved: totalCost } }
  // );

  return { reserved: false, reason: SAFE_MODE_MSG };
}

/**
 * Release previously reserved funds (on cancel or failure).
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.reservationId
 * @returns {Promise<{ released: false, reason: string }>}
 */
export async function release({ userId, reservationId }) {
  logger.info(`[reservation] ${SAFE_MODE_MSG}`, {
    action: "release",
    userId,
    reservationId,
  });

  // Future: move funds from reserved → available balance
  // await Wallet.findOneAndUpdate(
  //   { userId },
  //   { $inc: { balance: amount, reserved: -amount } }
  // );

  return { released: false, reason: SAFE_MODE_MSG };
}

/**
 * Settle a reservation after successful trade execution.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.tradeId
 * @param {string} params.reservationId
 * @returns {Promise<{ settled: false, reason: string }>}
 */
export async function settle({ userId, tradeId, reservationId }) {
  logger.info(`[reservation] ${SAFE_MODE_MSG}`, {
    action: "settle",
    userId,
    tradeId,
    reservationId,
  });

  // Future: clear reservation entry, finalize ledger
  // await Reservation.deleteOne({ _id: reservationId });

  return { settled: false, reason: SAFE_MODE_MSG };
}
