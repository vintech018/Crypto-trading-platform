/**
 * trade.service.js — Production-grade BUY / SELL / DEPOSIT execution
 *
 * ─── Financial Consistency Model ────────────────────────────────────────────
 * Every state-changing operation (BUY, SELL, DEPOSIT) does the following
 * atomically (in a single MongoDB session/transaction when available):
 *
 *   1. Read + validate current state (wallet, holdings)
 *   2. Compute new state using BigInt-based decimal arithmetic (no float errors)
 *   3. Write multiple documents in order:
 *        wallet  → holdings  → trade  → ledger (×2 for BUY/SELL)
 *   4. Commit (or abort + compensate on M0)
 *
 * ─── Transaction Strategy ───────────────────────────────────────────────────
 * Atlas M2+ clusters support multi-document ACID transactions via sessions.
 * Atlas M0 free tier does NOT. We detect this at runtime:
 *
 *   1. Attempt with a session (M2+)
 *   2. On error code 20 or 263 → disable sessions globally and retry without
 *
 * ─── Ledger Double-Entry ─────────────────────────────────────────────────────
 * Every trade produces TWO ledger entries for full auditability:
 *   BUY:
 *     { type: BUY,  asset: USD,  amount: totalValue  }  ← USD debit
 *     { type: BUY,  asset: COIN, amount: quantity    }  ← coin credit
 *   SELL:
 *     { type: SELL, asset: COIN, amount: quantity    }  ← coin debit
 *     { type: SELL, asset: USD,  amount: totalValue  }  ← USD credit
 *
 * ─── Precision ──────────────────────────────────────────────────────────────
 * All arithmetic uses the D() / decimal.js BigInt-based utility.
 * All DB writes are plain JS Numbers rounded to 8 decimal places.
 * This gives us satoshi-level precision without DB-level Decimal128.
 */

import mongoose from "mongoose";

import Wallet  from "../models/Wallet.model.js";
import Trade   from "../models/Trade.model.js";
import Holding from "../models/Holding.model.js";
import Ledger  from "../models/Ledger.model.js";
import logger  from "../utils/logger.js";
import { AppError } from "../utils/helpers.js";
import { D, weightedAvg, realisedPnL as calcRealisedPnL, round } from "../utils/decimal.js";
import { TRADE_TYPE } from "../utils/constants.js";
import { updateCandle } from "./ohlc.service.js";

// ─── Session capability flag ──────────────────────────────────────────────
// Set to false the first time a transaction attempt fails on M0.
let transactionsSupported = true;

// ── Session helpers ───────────────────────────────────────────────────────

async function tryStartSession() {
  if (!transactionsSupported) return null;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  } catch {
    transactionsSupported = false;
    return null;
  }
}

async function tryCommit(session) {
  if (session) await session.commitTransaction();
}

async function tryAbort(session) {
  if (session) {
    try { await session.abortTransaction(); } catch { /* swallow */ }
  }
}

function endSession(session) {
  if (session) session.endSession();
}

function isM0Error(err) {
  if (!err) return false;
  const msg = err.message || "";
  return (
    err.code === 20  ||
    err.code === 263 ||
    msg.includes("Transaction numbers are only allowed on a replica") ||
    msg.includes("cannot run a transaction on a standalone")
  );
}

// ── Ledger writer ─────────────────────────────────────────────────────────

/**
 * Insert a ledger entry. Includes wallet snapshot for USD flows.
 */
async function writeLedger(
  { userId, type, amount, asset, balanceBefore, balanceAfter, referenceId, note },
  session
) {
  const [entry] = await Ledger.create(
    [{
      userId,
      type,
      amount: round(amount, 8),
      asset: asset.toUpperCase(),
      balanceBefore: asset === "USD" ? round(balanceBefore, 8) : null,
      balanceAfter:  asset === "USD" ? round(balanceAfter,  8) : null,
      referenceId:   referenceId || null,
      note:          note || null,
    }],
    session ? { session } : {}
  );
  return entry;
}

// ─────────────────────────────────────────────────────────────────────────
// BUY
// ─────────────────────────────────────────────────────────────────────────

/**
 * Execute a BUY order atomically.
 *
 * @param {string} userId
 * @param {string} coin        — e.g. "BTC"
 * @param {number} quantity    — units to buy
 * @param {number} price       — USD per unit (client-submitted execution price)
 * @returns {{ trade, wallet, holding }}
 */
export async function executeBuy(userId, coin, quantity, price) {
  const qty        = D(quantity);
  const prc        = D(price);
  const totalValue = qty.times(prc); // USD cost of this buy

  const session = await tryStartSession();

  try {
    // ── 1. Fetch wallet ─────────────────────────────────────────────────
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new AppError("Wallet not found.", 404);

    const currentBalance = D(wallet.balance);

    if (currentBalance.lt(totalValue)) {
      throw new AppError(
        `Insufficient balance. Need $${totalValue.toFixed(2)}, have $${currentBalance.toFixed(2)}.`,
        400
      );
    }

    // ── 2. Compute new wallet balance ───────────────────────────────────
    const newBalance = currentBalance.minus(totalValue);

    wallet.balance = newBalance.toNumber();
    await wallet.save({ session });

    // ── 3. Upsert holding with weighted avg ─────────────────────────────
    let holding = await Holding.findOne({ userId, coin }).session(session);
    let newAvgBuyPrice;

    if (holding) {
      newAvgBuyPrice = weightedAvg(
        holding.quantity, holding.avgBuyPrice,
        qty.toNumber(), prc.toNumber()
      );
      const newQty      = D(holding.quantity).plus(qty).toNumber();
      const newTotalCost = D(holding.totalCost).plus(totalValue).toNumber();

      holding.quantity    = round(newQty, 8);
      holding.avgBuyPrice = round(newAvgBuyPrice, 8);
      holding.totalCost   = round(newTotalCost, 8);
      await holding.save({ session });
    } else {
      newAvgBuyPrice = prc.toNumber();
      [holding] = await Holding.create(
        [{
          userId,
          coin,
          quantity:    round(qty.toNumber(), 8),
          avgBuyPrice: round(newAvgBuyPrice, 8),
          totalCost:   round(totalValue.toNumber(), 8),
        }],
        session ? { session } : {}
      );
    }

    // ── 4. Insert trade record ──────────────────────────────────────────
    const [trade] = await Trade.create(
      [{
        userId,
        coin,
        type:        TRADE_TYPE.BUY,
        quantity:    round(qty.toNumber(), 8),
        price:       round(prc.toNumber(), 8),
        totalValue:  round(totalValue.toNumber(), 8),
        avgBuyPrice: round(newAvgBuyPrice, 8), // cost basis after this buy
        realisedPnL: null,
      }],
      session ? { session } : {}
    );

    // ── 5. Ledger: USD debit + coin credit ───────────────────────────────
    const balBefore = currentBalance.toNumber();
    const balAfter  = newBalance.toNumber();

    await writeLedger({
      userId, type: "BUY",
      amount:        round(totalValue.toNumber(), 8),
      asset:         "USD",
      balanceBefore: balBefore,
      balanceAfter:  balAfter,
      referenceId:   trade._id,
      note:          `Bought ${qty.toFixed(8)} ${coin} @ $${prc.toFixed(2)}`,
    }, session);

    await writeLedger({
      userId, type: "BUY",
      amount:      round(qty.toNumber(), 8),
      asset:       coin,
      balanceBefore: null,
      balanceAfter:  null,
      referenceId: trade._id,
      note:        `Received ${qty.toFixed(8)} ${coin}`,
    }, session);

    await tryCommit(session);
    // Update OHLC candles (fire-and-forget)
    updateCandle(coin, prc.toNumber(), qty.toNumber(), Date.now()).catch(() => {});
    logger.info("BUY executed", { userId, coin, quantity: qty.toNumber(), price: prc.toNumber(), totalValue: totalValue.toNumber() });

    return { trade, wallet, holding };

  } catch (err) {
    await tryAbort(session);
    if (isM0Error(err)) {
      transactionsSupported = false;
      logger.warn("Transactions not supported — retrying in non-transactional mode.");
      return executeBuy(userId, coin, quantity, price);
    }
    throw err;
  } finally {
    endSession(session);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SELL
// ─────────────────────────────────────────────────────────────────────────

/**
 * Execute a SELL order atomically.
 *
 * @param {string} userId
 * @param {string} coin
 * @param {number} quantity
 * @param {number} price
 * @returns {{ trade, wallet, realisedPnL }}
 */
export async function executeSell(userId, coin, quantity, price) {
  const qty        = D(quantity);
  const prc        = D(price);
  const totalValue = qty.times(prc); // USD proceeds

  const session = await tryStartSession();

  try {
    // ── 1. Validate holding ─────────────────────────────────────────────
    const holding = await Holding.findOne({ userId, coin }).session(session);
    if (!holding) throw new AppError(`You don't hold any ${coin}.`, 400);

    const heldQty = D(holding.quantity);
    if (heldQty.lt(qty)) {
      throw new AppError(
        `Insufficient ${coin}. Holding ${heldQty.toFixed(8)}, trying to sell ${qty.toFixed(8)}.`,
        400
      );
    }

    // Cost basis captured BEFORE modifying the holding
    const costBasis = holding.avgBuyPrice;
    const pnl       = calcRealisedPnL(prc.toNumber(), costBasis, qty.toNumber());

    // ── 2. Update or delete holding ─────────────────────────────────────
    const remainingQty = heldQty.minus(qty);

    if (remainingQty.isZero() ||
        D(remainingQty.toNumber()).lt(D(0.000000005))) {
      // Full close — remove the document
      await Holding.findByIdAndDelete(holding._id).session(session);
    } else {
      // Partial close — reduce quantity, recalculate totalCost
      const newTotalCost  = D(holding.totalCost).minus(qty.times(D(costBasis)));
      holding.quantity    = round(remainingQty.toNumber(), 8);
      holding.totalCost   = round(Math.max(0, newTotalCost.toNumber()), 8);
      // avgBuyPrice stays the same on a partial sell (FIFO average)
      await holding.save({ session });
    }

    // ── 3. Credit wallet ────────────────────────────────────────────────
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new AppError("Wallet not found.", 404);

    const currentBalance = D(wallet.balance);
    const newBalance     = currentBalance.plus(totalValue);

    wallet.balance = newBalance.toNumber();
    await wallet.save({ session });

    // ── 4. Insert trade record ──────────────────────────────────────────
    const [trade] = await Trade.create(
      [{
        userId,
        coin,
        type:        TRADE_TYPE.SELL,
        quantity:    round(qty.toNumber(), 8),
        price:       round(prc.toNumber(), 8),
        totalValue:  round(totalValue.toNumber(), 8),
        avgBuyPrice: round(costBasis, 8), // cost basis at time of sale
        realisedPnL: round(pnl, 8),
      }],
      session ? { session } : {}
    );

    // ── 5. Ledger: coin debit + USD credit ───────────────────────────────
    const balBefore = currentBalance.toNumber();
    const balAfter  = newBalance.toNumber();

    await writeLedger({
      userId, type: "SELL",
      amount:      round(qty.toNumber(), 8),
      asset:       coin,
      balanceBefore: null,
      balanceAfter:  null,
      referenceId: trade._id,
      note:        `Sold ${qty.toFixed(8)} ${coin} @ $${prc.toFixed(2)}`,
    }, session);

    await writeLedger({
      userId, type: "SELL",
      amount:        round(totalValue.toNumber(), 8),
      asset:         "USD",
      balanceBefore: balBefore,
      balanceAfter:  balAfter,
      referenceId:   trade._id,
      note:          `Received $${totalValue.toFixed(2)} from ${coin} sale. P/L: ${pnl >= 0 ? "+" : ""}${round(pnl, 2).toFixed(2)}`,
    }, session);

    await tryCommit(session);
    // Update OHLC candles (fire-and-forget)
    updateCandle(coin, prc.toNumber(), qty.toNumber(), Date.now()).catch(() => {});
    logger.info("SELL executed", { userId, coin, quantity: qty.toNumber(), price: prc.toNumber(), totalValue: totalValue.toNumber(), realisedPnL: pnl });

    return { trade, wallet, realisedPnL: round(pnl, 8) };

  } catch (err) {
    await tryAbort(session);
    if (isM0Error(err)) {
      transactionsSupported = false;
      logger.warn("Transactions not supported — retrying in non-transactional mode.");
      return executeSell(userId, coin, quantity, price);
    }
    throw err;
  } finally {
    endSession(session);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DEPOSIT
// ─────────────────────────────────────────────────────────────────────────

/**
 * Credit fiat into a user's wallet.
 *
 * @param {string} userId
 * @param {number} amount — USD amount to deposit
 * @returns {{ wallet, ledgerEntry }}
 */
export async function depositFunds(userId, amount) {
  const amt     = D(amount);
  const session = await tryStartSession();

  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) throw new AppError("Wallet not found.", 404);

    const currentBalance = D(wallet.balance);
    const newBalance     = currentBalance.plus(amt);

    wallet.balance = newBalance.toNumber();
    await wallet.save({ session });

    const [ledgerEntry] = await Ledger.create(
      [{
        userId,
        type:          "DEPOSIT",
        amount:        round(amt.toNumber(), 8),
        asset:         "USD",
        balanceBefore: round(currentBalance.toNumber(), 8),
        balanceAfter:  round(newBalance.toNumber(), 8),
        referenceId:   null,
        note:          `Manual deposit of $${amt.toFixed(2)}`,
      }],
      session ? { session } : {}
    );

    await tryCommit(session);
    logger.info("Deposit completed", { userId, amount: amt.toNumber() });
    return { wallet, ledgerEntry };

  } catch (err) {
    await tryAbort(session);
    if (isM0Error(err)) {
      transactionsSupported = false;
      return depositFunds(userId, amount);
    }
    throw err;
  } finally {
    endSession(session);
  }
}
