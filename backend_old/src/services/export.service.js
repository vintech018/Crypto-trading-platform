/**
 * export.service.js — Shared data-gathering layer for report exports
 *
 * Both Excel and PDF generators call getReportData() to fetch and normalise
 * all data in one place. This ensures:
 *   - consistent numbers between formats
 *   - a single query path to optimise
 *   - BigInt-safe arithmetic everywhere
 *
 * Returned shape:
 * {
 *   meta:       { userName, userEmail, generatedAt, startDate, endDate, asset }
 *   summary:    { totalInvested, portfolioValue, realisedPnL, unrealisedPnL, totalPnL, ... }
 *   portfolio:  [ { coin, quantity, avgBuyPrice, currentPrice, currentValue,
 *                   totalCost, unrealisedPnL, pnlPercent } ]
 *   trades:     [ { date, coin, type, quantity, price, totalValue,
 *                   avgBuyPrice, realisedPnL } ]
 *   ledger:     [ { date, type, amount, asset, balanceBefore, balanceAfter,
 *                   referenceId, note } ]
 * }
 */

import mongoose from "mongoose";

import Trade   from "../models/Trade.model.js";
import Holding from "../models/Holding.model.js";
import Ledger  from "../models/Ledger.model.js";
import User    from "../models/User.model.js";
import { getPrices } from "./price.service.js";
import { D, round }  from "../utils/decimal.js";
import { AppError }  from "../utils/helpers.js";
import logger        from "../utils/logger.js";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function buildDateFilter(startDate, endDate) {
  const df = {};
  if (startDate) df.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    df.$lte = end;
  }
  return df;
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

// ─── Main data fetcher ────────────────────────────────────────────────────────

/**
 * @param {string}  userId
 * @param {object}  opts
 * @param {string}  [opts.startDate]  — ISO date string
 * @param {string}  [opts.endDate]    — ISO date string
 * @param {string}  [opts.asset]      — uppercase coin ticker (optional filter)
 */
export async function getReportData(userId, opts = {}) {
  const { startDate, endDate, asset } = opts;
  const uid = new mongoose.Types.ObjectId(userId);

  // ── 1. Resolve user info ──────────────────────────────────────────────────
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("User not found.", 404);

  // ── 2. Build query filters ──────────────────────────────────────────────
  const dateFilter    = buildDateFilter(startDate, endDate);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const tradeFilter  = { userId: uid };
  const ledgerFilter = { userId: uid };
  if (hasDateFilter) {
    tradeFilter.createdAt  = dateFilter;
    ledgerFilter.createdAt = dateFilter;
  }
  if (asset) {
    tradeFilter.coin   = asset.toUpperCase();
    ledgerFilter.asset = asset.toUpperCase();
  }

  // ── 3. Fetch all data in parallel ─────────────────────────────────────
  const [trades, holdings, ledgerEntries] = await Promise.all([
    Trade.find(tradeFilter).sort({ createdAt: 1 }).lean(),
    Holding.find({ userId: uid }).lean(),   // always full portfolio snapshot
    Ledger.find(ledgerFilter).sort({ createdAt: 1 }).lean(),
  ]);

  // ── 4. Live prices for portfolio ───────────────────────────────────────
  const holdingCoins = [...new Set(holdings.map(h => h.coin))];
  const priceMap     = holdingCoins.length > 0 ? await getPrices(holdingCoins) : {};

  // ── 5. Compute summary figures using BigInt arithmetic ─────────────────
  let realisedPnL   = D(0);
  let unrealisedPnL = D(0);
  let totalCost     = D(0);
  let portfolioVal  = D(0);

  for (const t of trades) {
    if (t.type !== "SELL") continue;
    if (t.realisedPnL != null) {
      realisedPnL = realisedPnL.plus(D(t.realisedPnL));
    } else if (t.avgBuyPrice != null) {
      realisedPnL = realisedPnL.plus(
        D(t.price).minus(D(t.avgBuyPrice)).times(D(t.quantity))
      );
    }
  }

  for (const h of holdings) {
    const currentPrice = priceMap[h.coin] ?? 0;
    const tc  = h.totalCost ?? D(h.quantity).times(D(h.avgBuyPrice)).toNumber();
    const cv  = D(h.quantity).times(D(currentPrice));
    const upnl = cv.minus(D(tc));
    unrealisedPnL = unrealisedPnL.plus(upnl);
    totalCost     = totalCost.plus(D(tc));
    portfolioVal  = portfolioVal.plus(cv);
  }

  // ── 6. Normalise portfolio rows ─────────────────────────────────────────
  const portfolio = holdings.map(h => {
    const currentPrice = priceMap[h.coin] ?? 0;
    const tc           = h.totalCost ?? D(h.quantity).times(D(h.avgBuyPrice)).toNumber();
    const cv           = D(h.quantity).times(D(currentPrice)).toNumber();
    const upnl         = cv - tc;
    const pnlPct       = h.avgBuyPrice > 0
      ? ((currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
      : 0;
    return {
      coin:          h.coin,
      quantity:      round(h.quantity, 8),
      avgBuyPrice:   round(h.avgBuyPrice, 8),
      currentPrice:  round(currentPrice, 2),
      currentValue:  round(cv, 2),
      totalCost:     round(tc, 2),
      unrealisedPnL: round(upnl, 2),
      pnlPercent:    round(pnlPct, 2),
    };
  });

  // ── 7. Normalise trade rows ─────────────────────────────────────────────
  const tradeRows = trades.map(t => ({
    date:        fmtDate(t.createdAt),
    coin:        t.coin,
    type:        t.type,
    quantity:    round(t.quantity, 8),
    price:       round(t.price, 8),
    totalValue:  round(t.totalValue, 2),
    avgBuyPrice: t.avgBuyPrice != null ? round(t.avgBuyPrice, 8) : null,
    realisedPnL: t.realisedPnL != null ? round(t.realisedPnL, 2) : null,
    tradeId:     t._id.toString(),
  }));

  // ── 8. Normalise ledger rows ────────────────────────────────────────────
  const ledgerRows = ledgerEntries.map(e => ({
    date:          fmtDate(e.createdAt),
    type:          e.type,
    amount:        round(e.amount, 8),
    asset:         e.asset,
    balanceBefore: e.balanceBefore != null ? round(e.balanceBefore, 2) : null,
    balanceAfter:  e.balanceAfter  != null ? round(e.balanceAfter,  2) : null,
    referenceId:   e.referenceId ? e.referenceId.toString() : null,
    note:          e.note ?? null,
  }));

  // ── 9. File-naming metadata ─────────────────────────────────────────────
  const startLabel = startDate ? startDate.slice(0, 10) : "all";
  const endLabel   = endDate   ? endDate.slice(0, 10)   : "now";
  const assetLabel = asset ? `_${asset}` : "";
  const fileSlug   = `report_${startLabel}_to_${endLabel}${assetLabel}`;

  logger.info("Report data assembled", {
    userId,
    trades:  trades.length,
    ledger:  ledgerEntries.length,
    holdings: holdings.length,
  });

  return {
    meta: {
      userName:      user.name,
      userEmail:     user.email,
      generatedAt:   fmtDate(new Date()),
      startDate:     startDate ?? null,
      endDate:       endDate   ?? null,
      asset:         asset     ?? null,
      fileSlug,
    },
    summary: {
      totalTrades:     trades.length,
      buyCount:        trades.filter(t => t.type === "BUY").length,
      sellCount:       trades.filter(t => t.type === "SELL").length,
      totalInvested:   round(totalCost.toNumber(), 2),
      portfolioValue:  round(portfolioVal.toNumber(), 2),
      realisedPnL:     round(realisedPnL.toNumber(), 2),
      unrealisedPnL:   round(unrealisedPnL.toNumber(), 2),
      totalPnL:        round(realisedPnL.plus(unrealisedPnL).toNumber(), 2),
    },
    portfolio,
    trades:  tradeRows,
    ledger:  ledgerRows,
  };
}
