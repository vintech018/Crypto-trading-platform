/**
 * closePosition.controller.js — POST /api/trade/close
 *
 * Handles the "Exit Trade" (close position) request from the frontend.
 *
 * Request body:
 *   { coin, quantity? }
 *
 *   coin       — required: asset ticker (e.g. "BTC")
 *   quantity   — optional: units to close. Omit to close the FULL position.
 *
 * Authentication:
 *   req.user.id is set by authenticate middleware (already on /api/trade/* router)
 *
 * Response (success):
 *   {
 *     trade:       { id, coin, type, quantity, price, totalValue, realisedPnL, createdAt },
 *     realisedPnL: number,
 *     exitPrice:   number,
 *     walletBalance: number
 *   }
 *
 * ⚠️  ADDITIVE ONLY — does NOT modify buy, sell, deposit, tradeHistory, or tradeSummary.
 */

import { closePosition }        from "../services/closePosition.service.js";
import { getPortfolio }         from "../services/portfolio.service.js";
import { sendSuccess }          from "../utils/helpers.js";
import { createAlert }          from "./alert.controller.js";
import { emitTradeUpdate, emitPositionClosed } from "../websocket.js";
import { round }                from "../utils/decimal.js";
import logger                   from "../utils/logger.js";
import { emitTradeEvent }       from "../analytics/services/analyticsEmitter.js";

/**
 * POST /api/trade/close
 * Body: { coin, quantity? }
 */
export async function closeTrade(req, res, next) {
  try {
    const userId  = req.user.id;
    const { coin, quantity } = req.body;

    // ── Execute close ─────────────────────────────────────────────────────
    const { trade, wallet, realisedPnL, exitPrice, quantity: closedQty } =
      await closePosition(userId, coin, quantity ?? null);

    // ── Create alert ──────────────────────────────────────────────────────
    const pnlSign  = realisedPnL >= 0 ? "+" : "";
    await createAlert(
      userId,
      `Position closed: ${closedQty} ${coin} @ $${exitPrice} | P/L: ${pnlSign}$${round(realisedPnL, 2).toFixed(2)}`,
      realisedPnL >= 0 ? "SUCCESS" : "WARNING"
    );

    // ── Emit real-time events ─────────────────────────────────────────────
    // 1. Fetch fresh portfolio for real-time UI update
    const portfolio = await getPortfolio(userId);

    // 2. Backward-compatible trade:update (keeps existing PortfolioPanel in sync)
    emitTradeUpdate(userId, { portfolio, latestTrade: trade, pnl: realisedPnL });

    // 3. New targeted events for Open Positions + Trade History
    emitPositionClosed(userId, {
      coin,
      quantity:    closedQty,
      exitPrice,
      realisedPnL,
      trade: {
        id:          trade._id,
        coin:        trade.coin,
        type:        trade.type,
        quantity:    trade.quantity,
        price:       trade.price,
        totalValue:  trade.totalValue,
        realisedPnL: trade.realisedPnL,
        createdAt:   trade.createdAt,
      },
      portfolio,
    });

    // ─── Analytics sidecar: fire-and-forget replication to PostgreSQL ───────
    emitTradeEvent({
      userId,
      tradeId:   trade._id,
      asset:     trade.coin,
      tradeType: "SELL",
      amount:    trade.totalValue,
      pnl:       realisedPnL ?? 0,
      price:     trade.price,
      quantity:  trade.quantity,
    });

    logger.info("[closeTrade] position closed via API", {
      userId,
      coin,
      quantity: closedQty,
      exitPrice,
      realisedPnL,
    });

    return sendSuccess(res, 200, `Position for ${coin} closed at $${exitPrice}.`, {
      trade: {
        id:          trade._id,
        coin:        trade.coin,
        type:        trade.type,
        quantity:    trade.quantity,
        price:       trade.price,
        totalValue:  trade.totalValue,
        avgBuyPrice: trade.avgBuyPrice,
        realisedPnL: trade.realisedPnL,
        createdAt:   trade.createdAt,
      },
      realisedPnL,
      exitPrice,
      walletBalance: wallet.balance,
    });
  } catch (err) {
    // Non-fatal: alert creation failure should not mask the real error
    try {
      await createAlert(req.user.id, `Close position failed: ${err.message}`, "ERROR");
    } catch { /* swallow alert failure */ }

    next(err);
  }
}
