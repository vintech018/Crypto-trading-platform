/**
 * portfolio.service.js — Holdings + Unrealised P/L
 *
 * Returns the user's full portfolio:
 *   - Wallet cash balance (from cached Wallet document)
 *   - All open holdings enriched with:
 *       • avgBuyPrice  (cost basis from Holding document)
 *       • currentPrice (live from CoinGecko / cache)
 *       • currentValue (qty × currentPrice)
 *       • totalCost    (qty × avgBuyPrice)
 *       • unrealisedPnL (currentValue - totalCost)
 *       • pnlPercent   ((currentPrice - avgBuyPrice) / avgBuyPrice × 100)
 *   - Totals: totalHoldingsValue, totalUnrealisedPnL, totalPortfolioValue
 *
 * Uses high-precision arithmetic from decimal.js for all calculations.
 * Prices are fetched in a single batch call to avoid N+1 CoinGecko requests.
 */

import Holding from "../models/Holding.model.js";
import Wallet  from "../models/Wallet.model.js";
import { getPrices } from "./price.service.js";
import { AppError }  from "../utils/helpers.js";
import { D, round, unrealisedPnL as calcUnrealisedPnL } from "../utils/decimal.js";

/**
 * Return the user's portfolio.
 * @param {string} userId — MongoDB ObjectId string
 */
export async function getPortfolio(userId) {
  const [holdings, wallet] = await Promise.all([
    Holding.find({ userId }).lean(),
    Wallet.findOne({ userId }).lean(),
  ]);

  if (!wallet) throw new AppError("Wallet not found.", 404);

  const walletBalance = round(wallet.balance, 8);

  if (holdings.length === 0) {
    return {
      walletBalance,
      holdings: [],
      totalHoldingsValue:  0,
      totalUnrealisedPnL:  0,
      totalPortfolioValue: walletBalance,
    };
  }

  // ── Batch price fetch ──────────────────────────────────────────────────
  const coins    = holdings.map(h => h.coin);
  const priceMap = await getPrices(coins);

  // ── Enrich each holding ────────────────────────────────────────────────
  let totalHoldingsValue  = D(0);
  let totalUnrealisedPnL  = D(0);
  let totalCostBasis      = D(0);

  const enriched = holdings.map(h => {
    const qty          = h.quantity;
    const avgBuy       = h.avgBuyPrice;
    const totalCost    = h.totalCost ?? round(D(qty).times(D(avgBuy)).toNumber(), 8);
    const currentPrice = priceMap[h.coin] ?? 0;

    const cv       = D(qty).times(D(currentPrice));  // current value
    const upnl     = cv.minus(D(totalCost));          // unrealised P/L
    const pnlPct   = avgBuy > 0
      ? D(currentPrice).minus(D(avgBuy)).div(D(avgBuy)).times(D(100)).toNumber()
      : 0;

    totalHoldingsValue = totalHoldingsValue.plus(cv);
    totalUnrealisedPnL = totalUnrealisedPnL.plus(upnl);
    totalCostBasis     = totalCostBasis.plus(D(totalCost));

    return {
      coin:          h.coin,
      quantity:      round(qty, 8),
      avgBuyPrice:   round(avgBuy, 8),
      totalCost:     round(totalCost, 8),
      currentPrice:  round(currentPrice, 2),
      currentValue:  round(cv.toNumber(), 2),
      unrealisedPnL: round(upnl.toNumber(), 2),
      pnlPercent:    round(pnlPct, 2),
      updatedAt:     h.updatedAt ?? null,
    };
  });

  // ── Overall portfolio P/L ──────────────────────────────────────────────
  const totalPortfolioValue = D(walletBalance).plus(totalHoldingsValue).toNumber();
  const overallPnlPct       = totalCostBasis.isZero()
    ? 0
    : totalUnrealisedPnL.div(totalCostBasis).times(D(100)).toNumber();

  return {
    walletBalance,
    holdings:            enriched,
    totalHoldingsValue:  round(totalHoldingsValue.toNumber(), 2),
    totalUnrealisedPnL:  round(totalUnrealisedPnL.toNumber(), 2),
    totalCostBasis:      round(totalCostBasis.toNumber(), 2),
    overallPnlPercent:   round(overallPnlPct, 2),
    totalPortfolioValue: round(totalPortfolioValue, 2),
  };
}
