/**
 * report.service.js — Financial Reporting
 *
 * Key improvement over v1:
 *   Realised P/L now uses the avgBuyPrice stored ON THE TRADE RECORD
 *   (captured at execution time) rather than the CURRENT holding avgBuyPrice.
 *
 *   This means P/L is accurate even for coins that have been fully sold
 *   (where the holding no longer exists) and for positions that have been
 *   partially sold at different price levels.
 *
 * Report sections:
 *   summary           — totalTrades, buyCount, sellCount, realisedPnL, unrealisedPnL
 *   tradeHistory      — full paginated trade list with per-trade P/L
 *   monthlyPerformance — volume and net P/L broken down by YYYY-MM
 *   coinBreakdown      — per-coin trade stats and realised P/L
 */

import Trade   from "../models/Trade.model.js";
import Holding from "../models/Holding.model.js";
import { getPrices }  from "./price.service.js";
import { D, round }   from "../utils/decimal.js";
import logger         from "../utils/logger.js";

/**
 * Generate a comprehensive financial report for a user.
 *
 * @param {string}           userId
 * @param {string|undefined} startDate — ISO date (inclusive)
 * @param {string|undefined} endDate   — ISO date (inclusive, clamped to 23:59:59)
 */
export async function generateReport(userId, startDate, endDate) {
  // ── Date filter ──────────────────────────────────────────────────────────
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }

  const tradeQuery = { userId };
  if (Object.keys(dateFilter).length > 0) tradeQuery.createdAt = dateFilter;

  // ── Fetch trades + holdings in parallel ─────────────────────────────────
  const [trades, holdings] = await Promise.all([
    Trade.find(tradeQuery).sort({ createdAt: -1 }).lean(),
    Holding.find({ userId }).lean(),
  ]);

  const sellTrades = trades.filter(t => t.type === "SELL");
  const buyTrades  = trades.filter(t => t.type === "BUY");

  // ── Realised P/L ─────────────────────────────────────────────────────────
  // Use the realisedPnL pre-stored on each trade (captured at execution time).
  // Fall back to on-the-fly calculation for legacy trades (avgBuyPrice present
  // but realisedPnL null).
  let realisedPnL = D(0);

  for (const t of sellTrades) {
    if (t.realisedPnL != null) {
      realisedPnL = realisedPnL.plus(D(t.realisedPnL));
    } else if (t.avgBuyPrice != null) {
      // Legacy trade: compute from stored avgBuyPrice
      const pnl = D(t.price).minus(D(t.avgBuyPrice)).times(D(t.quantity));
      realisedPnL = realisedPnL.plus(pnl);
    }
    // Trades with neither field are skipped (pre-migration data)
  }

  // ── Unrealised P/L ───────────────────────────────────────────────────────
  const coins    = [...new Set(holdings.map(h => h.coin))];
  const priceMap = coins.length > 0 ? await getPrices(coins) : {};

  let unrealisedPnL  = D(0);
  let totalCostBasis = D(0);

  for (const h of holdings) {
    const currentPrice = priceMap[h.coin] ?? 0;
    const tc           = h.totalCost ?? D(h.quantity).times(D(h.avgBuyPrice)).toNumber();
    const cv           = D(h.quantity).times(D(currentPrice));
    unrealisedPnL  = unrealisedPnL.plus(cv.minus(D(tc)));
    totalCostBasis = totalCostBasis.plus(D(tc));
  }

  // ── Monthly performance ───────────────────────────────────────────────────
  const monthlyMap = {};

  for (const t of trades) {
    const month = new Date(t.createdAt).toISOString().slice(0, 7); // "2024-03"
    if (!monthlyMap[month]) {
      monthlyMap[month] = {
        month,
        totalTrades: 0,
        buyCount:    0,
        sellCount:   0,
        buyVolume:   D(0),
        sellVolume:  D(0),
        realisedPnL: D(0),
      };
    }
    const m = monthlyMap[month];
    m.totalTrades++;

    if (t.type === "BUY") {
      m.buyCount++;
      m.buyVolume = m.buyVolume.plus(D(t.totalValue));
    } else {
      m.sellCount++;
      m.sellVolume = m.sellVolume.plus(D(t.totalValue));
      if (t.realisedPnL != null) {
        m.realisedPnL = m.realisedPnL.plus(D(t.realisedPnL));
      } else if (t.avgBuyPrice != null) {
        const pnl = D(t.price).minus(D(t.avgBuyPrice)).times(D(t.quantity));
        m.realisedPnL = m.realisedPnL.plus(pnl);
      }
    }
  }

  const monthlyPerformance = Object.values(monthlyMap)
    .map(m => ({
      month:        m.month,
      totalTrades:  m.totalTrades,
      buyCount:     m.buyCount,
      sellCount:    m.sellCount,
      buyVolume:    round(m.buyVolume.toNumber(), 2),
      sellVolume:   round(m.sellVolume.toNumber(), 2),
      realisedPnL:  round(m.realisedPnL.toNumber(), 2),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // ── Per-coin breakdown ────────────────────────────────────────────────────
  const coinMap = {};

  for (const t of trades) {
    if (!coinMap[t.coin]) {
      coinMap[t.coin] = {
        coin:        t.coin,
        buyCount:    0,
        sellCount:   0,
        totalBought: D(0),
        totalSold:   D(0),
        realisedPnL: D(0),
      };
    }
    const c = coinMap[t.coin];

    if (t.type === "BUY") {
      c.buyCount++;
      c.totalBought = c.totalBought.plus(D(t.quantity));
    } else {
      c.sellCount++;
      c.totalSold = c.totalSold.plus(D(t.quantity));
      if (t.realisedPnL != null) {
        c.realisedPnL = c.realisedPnL.plus(D(t.realisedPnL));
      } else if (t.avgBuyPrice != null) {
        const pnl = D(t.price).minus(D(t.avgBuyPrice)).times(D(t.quantity));
        c.realisedPnL = c.realisedPnL.plus(pnl);
      }
    }
  }

  const coinBreakdown = Object.values(coinMap).map(c => ({
    coin:        c.coin,
    buyCount:    c.buyCount,
    sellCount:   c.sellCount,
    totalBought: round(c.totalBought.toNumber(), 8),
    totalSold:   round(c.totalSold.toNumber(), 8),
    realisedPnL: round(c.realisedPnL.toNumber(), 2),
  }));

  // ── Trade history ─────────────────────────────────────────────────────────
  const tradeHistory = trades.map(t => ({
    id:          t._id,
    coin:        t.coin,
    type:        t.type,
    quantity:    t.quantity,
    price:       t.price,
    totalValue:  t.totalValue,
    avgBuyPrice: t.avgBuyPrice ?? null,
    realisedPnL: t.realisedPnL ?? null,
    createdAt:   t.createdAt,
  }));

  logger.info("Report generated", {
    userId, startDate, endDate,
    totalTrades: trades.length,
    realisedPnL: realisedPnL.toNumber(),
  });

  return {
    summary: {
      totalTrades:  trades.length,
      buyCount:     buyTrades.length,
      sellCount:    sellTrades.length,
      realisedPnL:  round(realisedPnL.toNumber(), 2),
      unrealisedPnL: round(unrealisedPnL.toNumber(), 2),
      totalCostBasis: round(totalCostBasis.toNumber(), 2),
      totalPnL:     round(realisedPnL.plus(unrealisedPnL).toNumber(), 2),
    },
    tradeHistory,
    monthlyPerformance,
    coinBreakdown,
  };
}
