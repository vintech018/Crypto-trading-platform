/**
 * order.controller.js — HTTP handlers for orders, trade history, and charts
 */

import * as orderService from "../services/order.service.js";
import { getCandles }    from "../services/ohlc.service.js";
import { getPortfolio }  from "../services/portfolio.service.js";
import { sendSuccess }   from "../utils/helpers.js";
import { createAlert }   from "./alert.controller.js";
import { emitTradeUpdate } from "../websocket.js";

// ── Limit Orders ──────────────────────────────────────────────────────────

/**
 * POST /api/orders
 * Body: { coin, type, price, quantity }
 */
export async function placeOrder(req, res, next) {
  try {
    const { coin, type, price, quantity } = req.body;
    const { order, fills } = await orderService.placeLimitOrder(
      req.user.id, coin, type, price, quantity
    );
    const msg = fills.length > 0
      ? `Order placed and ${fills.length} fill(s) executed.`
      : "Order placed and resting in order book.";
      
    await createAlert(req.user.id, `Limit Order: ${type} ${quantity} ${coin} @ $${price} - ${fills.length} fill(s)`, "SUCCESS");
    
    if (fills.length > 0) {
      const portfolio = await getPortfolio(req.user.id);
      emitTradeUpdate(req.user.id, { portfolio, latestTrade: fills[0], pnl: 0 });
    }
    
    return sendSuccess(res, 201, msg, { order, fills });
  } catch (err) {
    await createAlert(req.user.id, `Order failed: ${err.message}`, "ERROR");
    next(err);
  }
}

/**
 * DELETE /api/orders/:orderId
 */
export async function cancelOrder(req, res, next) {
  try {
    const order = await orderService.cancelOrder(req.user.id, req.params.orderId);
    return sendSuccess(res, 200, "Order cancelled.", { order });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders
 * Query: { coin, status, page, limit }
 *   status — comma-separated: OPEN,PARTIAL,FILLED,CANCELLED
 *   Default: OPEN,PARTIAL (active orders only)
 */
export async function getOrders(req, res, next) {
  try {
    const { coin, status, page, limit } = req.query;
    const data = await orderService.getUserOrders(req.user.id, { coin, status, page, limit });
    return sendSuccess(res, 200, "Orders fetched.", data);
  } catch (err) {
    next(err);
  }
}

// ── Order Book Snapshot ────────────────────────────────────────────────────

/**
 * GET /api/orders/book/:coin?depth=20
 * Returns aggregated bids + asks from the DB order book.
 * (Different from Binance WebSocket — this shows YOUR platform's orders)
 */
export async function getOrderBook(req, res, next) {
  try {
    const { coin } = req.params;
    const depth = parseInt(req.query.depth) || 20;
    const data = await orderService.getOrderBookSnapshot(coin, depth);
    return sendSuccess(res, 200, "Order book fetched.", data);
  } catch (err) {
    next(err);
  }
}

// ── Trade History ──────────────────────────────────────────────────────────

/**
 * GET /api/orders/trades
 * Query: { coin, type, from, to, page, limit }
 */
export async function getTradeHistory(req, res, next) {
  try {
    const { coin, type, from, to, page, limit } = req.query;
    const data = await orderService.getTradeHistory(req.user.id, { coin, type, from, to, page, limit });
    return sendSuccess(res, 200, "Trade history fetched.", data);
  } catch (err) {
    next(err);
  }
}

// ── OHLC Candles ──────────────────────────────────────────────────────────

/**
 * GET /api/orders/candles/:coin
 * Query: { interval=1h, limit=200, before }
 *   interval — 1m | 5m | 15m | 1h | 4h | 1d
 *   limit    — number of candles (max 500)
 *   before   — openTime ms for pagination
 */
export async function getOHLC(req, res, next) {
  try {
    const { coin }  = req.params;
    const { interval = "1h", limit = 200, before } = req.query;
    const candles = await getCandles(coin, interval, limit, before ? Number(before) : null);
    return sendSuccess(res, 200, "Candles fetched.", { coin: coin.toUpperCase(), interval, candles });
  } catch (err) {
    next(err);
  }
}
