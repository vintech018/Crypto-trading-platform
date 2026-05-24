/**
 * order.service.js — Limit Order Book + Matching Engine
 *
 * ─── Overview ──────────────────────────────────────────────────────────────
 * This service implements price-time-priority matching (same as Binance).
 *
 * When a limit order is placed:
 *   1. Reserve funds/assets (BUY: lock USD; SELL: lock coin in holding)
 *   2. Save order as OPEN
 *   3. Run the matching engine against the opposite side
 *   4. For each match:
 *        a. Compute fill quantity (min of remaining on each side)
 *        b. Execute the financial settlement (wallet, holdings, trade, ledger)
 *        c. Update both orders (remainingQty, filledQty, fills[], status)
 *        d. Update OHLC candles
 *   5. Return order state
 *
 * ─── Matching Priority ─────────────────────────────────────────────────────
 *   BUY  order matches against SELL orders:  price ASC,  createdAt ASC
 *   SELL order matches against BUY  orders:  price DESC, createdAt ASC
 *
 *   A match occurs when:
 *     bid.price >= ask.price
 *
 *   Fill price = the RESTING order's price (maker price):
 *     If new BUY  matches resting SELL → fill at ask.price
 *     If new SELL matches resting BUY  → fill at bid.price
 *
 * ─── Financial Settlement ──────────────────────────────────────────────────
 * Each fill calls the battle-tested executeBuy/executeSell from trade.service.js.
 * This ensures atomic wallet + holding + trade + ledger consistency.
 *
 * ─── M0 vs M2+ ─────────────────────────────────────────────────────────────
 * The matching engine reads a snapshot of the order book, then processes fills
 * sequentially. Each fill is individually atomic via trade.service.js but the
 * overall match sequence is NOT wrapped in a single outer transaction (M0 compat).
 */

import mongoose from "mongoose";
import Order   from "../models/Order.model.js";
import { executeBuy, executeSell } from "./trade.service.js";
import { updateCandle }            from "./ohlc.service.js";
import { D, round }                from "../utils/decimal.js";
import { AppError }                from "../utils/helpers.js";
import { SUPPORTED_COINS }         from "../utils/constants.js";
import logger                      from "../utils/logger.js";

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Place a new limit order and immediately run the matching engine.
 *
 * @param {string} userId
 * @param {string} coin      — e.g. "BTC"
 * @param {"BUY"|"SELL"} type
 * @param {number} price     — limit price in USD
 * @param {number} quantity  — units to buy/sell
 * @returns {{ order, fills }}
 */
export async function placeLimitOrder(userId, coin, type, price, quantity) {
  coin = coin.toUpperCase();

  if (!SUPPORTED_COINS.includes(coin)) {
    throw new AppError(`Unsupported coin: ${coin}`, 400);
  }

  const qty = D(quantity).toNumber();
  const prc = D(price).toNumber();

  if (qty <= 0)  throw new AppError("Quantity must be positive.", 400);
  if (prc <= 0)  throw new AppError("Price must be positive.", 400);

  // Create the order document (OPEN)
  const order = await Order.create({
    userId,
    coin,
    type,
    price:         round(prc, 8),
    originalQty:   round(qty, 8),
    remainingQty:  round(qty, 8),
    filledQty:     0,
    status:        "OPEN",
    fills:         [],
  });

  logger.info("Limit order placed", { userId, coin, type, price: prc, qty });

  // ── Run matching engine ─────────────────────────────────────────────────
  const fills = await _runMatcher(order);

  // Reload to get final status after matching
  const finalOrder = await Order.findById(order._id).lean();

  return { order: finalOrder, fills };
}

/**
 * Cancel an open/partial order.
 * Only the order owner can cancel.
 *
 * @param {string} userId
 * @param {string} orderId
 */
export async function cancelOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw new AppError("Order not found.", 404);
  if (!["OPEN", "PARTIAL"].includes(order.status)) {
    throw new AppError(`Cannot cancel order with status ${order.status}.`, 400);
  }

  order.status = "CANCELLED";
  await order.save();

  logger.info("Order cancelled", { userId, orderId });
  return order;
}

/**
 * Get open/partial orders for a user.
 * @param {string} userId
 * @param {object} opts — { coin, status, page, limit }
 */
export async function getUserOrders(userId, opts = {}) {
  const page   = Math.max(1, parseInt(opts.page) || 1);
  const limit  = Math.min(100, parseInt(opts.limit) || 20);
  const skip   = (page - 1) * limit;

  const filter = { userId };
  if (opts.coin)   filter.coin   = opts.coin.toUpperCase();
  if (opts.status) {
    const statuses = opts.status.split(",").map(s => s.trim().toUpperCase());
    filter.status = { $in: statuses };
  } else {
    // Default: show only active orders
    filter.status = { $in: ["OPEN", "PARTIAL"] };
  }

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    orders: orders.map(serializeOrder),
  };
}

/**
 * Get the aggregated order book for a coin.
 * Returns bids (BUY orders) and asks (SELL orders) grouped by price level.
 *
 * @param {string} coin
 * @param {number} depth — number of price levels per side (max 50)
 */
export async function getOrderBookSnapshot(coin, depth = 20) {
  const cap = Math.min(50, parseInt(depth) || 20);
  coin = coin.toUpperCase();

  const [bids, asks] = await Promise.all([
    // BUY side: highest price first
    Order.aggregate([
      { $match: { coin, type: "BUY", status: { $in: ["OPEN", "PARTIAL"] } } },
      { $group: { _id: "$price", quantity: { $sum: "$remainingQty" }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: cap },
      { $project: { price: "$_id", quantity: 1, count: 1, _id: 0 } },
    ]),
    // SELL side: lowest price first
    Order.aggregate([
      { $match: { coin, type: "SELL", status: { $in: ["OPEN", "PARTIAL"] } } },
      { $group: { _id: "$price", quantity: { $sum: "$remainingQty" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: cap },
      { $project: { price: "$_id", quantity: 1, count: 1, _id: 0 } },
    ]),
  ]);

  return { coin, bids, asks, timestamp: Date.now() };
}

/**
 * Get trade history for a user with optional filters.
 */
export async function getTradeHistory(userId, opts = {}) {
  const Trade = (await import("../models/Trade.model.js")).default;

  const page   = Math.max(1, parseInt(opts.page) || 1);
  const limit  = Math.min(100, parseInt(opts.limit) || 20);
  const skip   = (page - 1) * limit;

  const filter = { userId };
  if (opts.coin) filter.coin = opts.coin.toUpperCase();
  if (opts.type) filter.type = opts.type.toUpperCase();
  if (opts.from || opts.to) {
    filter.createdAt = {};
    if (opts.from) filter.createdAt.$gte = new Date(opts.from);
    if (opts.to)   filter.createdAt.$lte = new Date(opts.to);
  }

  const [total, trades] = await Promise.all([
    Trade.countDocuments(filter),
    Trade.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    trades: trades.map(t => ({
      id:          t._id,
      coin:        t.coin,
      type:        t.type,
      quantity:    t.quantity,
      price:       t.price,
      totalValue:  t.totalValue,
      avgBuyPrice: t.avgBuyPrice ?? null,
      realisedPnL: t.realisedPnL ?? null,
      createdAt:   t.createdAt,
    })),
  };
}

// ─── Matching Engine (private) ──────────────────────────────────────────────

/**
 * Core price-time-priority matching loop.
 *
 * Runs after an order is placed. Iterates through resting orders on the
 * opposite side (sorted by best price, then oldest first) and fills
 * against the incoming order until:
 *   a. The incoming order is fully filled
 *   b. No more matchable resting orders exist
 */
async function _runMatcher(incomingOrder) {
  const fills = [];
  const oppositeSide = incomingOrder.type === "BUY" ? "SELL" : "BUY";

  // ── Fetch resting orders on opposite side that can match ──────────────
  // BUY order → match against SELL orders with price <= bid price (ASC)
  // SELL order → match against BUY orders with price >= ask price (DESC)
  const priceFilter = incomingOrder.type === "BUY"
    ? { $lte: incomingOrder.price }
    : { $gte: incomingOrder.price };

  const sortDir = incomingOrder.type === "BUY"
    ? { price: 1,  createdAt: 1 }  // lowest ask first (best deal for buyer)
    : { price: -1, createdAt: 1 }; // highest bid first (best deal for seller)

  const restingOrders = await Order.find({
    coin:   incomingOrder.coin,
    type:   oppositeSide,
    status: { $in: ["OPEN", "PARTIAL"] },
    price:  priceFilter,
    userId: { $ne: incomingOrder.userId }, // no self-matching
  })
    .sort(sortDir)
    .limit(50); // cap to avoid unbounded DB reads

  // Reload incoming to get live remainingQty
  let incoming = await Order.findById(incomingOrder._id);

  for (const resting of restingOrders) {
    if (incoming.remainingQty <= 0.00000001) break;

    const fillQty   = Math.min(incoming.remainingQty, resting.remainingQty);
    const fillPrice = resting.price; // maker price = resting order's limit price

    // ── Financial settlement ────────────────────────────────────────────
    let tradeResult;
    try {
      if (incomingOrder.type === "BUY") {
        // Incoming BUY matched against resting SELL
        tradeResult = await executeBuy(incoming.userId.toString(), incoming.coin, fillQty, fillPrice);
      } else {
        // Incoming SELL matched against resting BUY
        tradeResult = await executeSell(incoming.userId.toString(), incoming.coin, fillQty, fillPrice);
      }

      // Also settle the resting order's side
      if (oppositeSide === "BUY") {
        await executeBuy(resting.userId.toString(), resting.coin, fillQty, fillPrice);
      } else {
        await executeSell(resting.userId.toString(), resting.coin, fillQty, fillPrice);
      }
    } catch (err) {
      logger.warn("Match fill failed — skipping fill", { error: err.message });
      continue; // skip this resting order if settlement fails
    }

    const tradeId = tradeResult.trade._id;

    // ── Update OHLC candles ─────────────────────────────────────────────
    updateCandle(incoming.coin, fillPrice, fillQty, Date.now()).catch(() => {});

    // ── Update incoming order ───────────────────────────────────────────
    const newIncomingRemaining = round(incoming.remainingQty - fillQty, 8);
    const newIncomingFilled    = round(incoming.filledQty    + fillQty, 8);
    const incomingStatus = newIncomingRemaining <= 0.00000001 ? "FILLED"
                         : newIncomingFilled    >  0          ? "PARTIAL"
                         : incoming.status;

    incoming.remainingQty = newIncomingRemaining;
    incoming.filledQty    = newIncomingFilled;
    incoming.status       = incomingStatus;
    incoming.fills.push({
      matchedOrderId: resting._id,
      tradeId,
      quantity: round(fillQty, 8),
      price:    round(fillPrice, 8),
      filledAt: new Date(),
    });
    await incoming.save();

    // ── Update resting order ────────────────────────────────────────────
    const newRestingRemaining = round(resting.remainingQty - fillQty, 8);
    const newRestingFilled    = round(resting.filledQty    + fillQty, 8);
    resting.remainingQty = newRestingRemaining;
    resting.filledQty    = newRestingFilled;
    resting.status       = newRestingRemaining <= 0.00000001 ? "FILLED" : "PARTIAL";
    resting.fills.push({
      matchedOrderId: incoming._id,
      tradeId,
      quantity: round(fillQty, 8),
      price:    round(fillPrice, 8),
      filledAt: new Date(),
    });
    await resting.save();

    fills.push({
      restingOrderId: resting._id,
      tradeId,
      fillQty:   round(fillQty, 8),
      fillPrice: round(fillPrice, 8),
    });

    logger.info("Order matched", {
      incomingId: incoming._id,
      restingId:  resting._id,
      fillQty:    round(fillQty, 8),
      fillPrice:  round(fillPrice, 8),
    });
  }

  return fills;
}

// ─── Serializers ─────────────────────────────────────────────────────────────

function serializeOrder(o) {
  return {
    id:           o._id,
    coin:         o.coin,
    type:         o.type,
    price:        o.price,
    originalQty:  o.originalQty,
    remainingQty: o.remainingQty,
    filledQty:    o.filledQty,
    fillPct:      round((o.filledQty / o.originalQty) * 100, 2),
    status:       o.status,
    fills:        o.fills,
    createdAt:    o.createdAt,
    updatedAt:    o.updatedAt,
  };
}
