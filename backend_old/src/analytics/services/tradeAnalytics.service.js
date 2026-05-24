/**
 * tradeAnalytics.service.js — Analytics replication service
 *
 * ⚠️  ARCHITECTURE NOTE — READ BEFORE MODIFYING:
 *     ┌─────────────────────────────────────────────────────────────────────┐
 *     │  MongoDB Atlas  =  PRIMARY database (source of truth)               │
 *     │  PostgreSQL     =  SECONDARY analytics layer (read-heavy replicas)  │
 *     └─────────────────────────────────────────────────────────────────────┘
 *
 * ALL WRITES IN THIS FILE ARE:
 *   1. Fire-and-forget (callers do NOT await)
 *   2. Wrapped in try/catch (failures are logged, never thrown)
 *   3. Non-blocking (trade execution ALWAYS succeeds regardless of PG state)
 *
 * This file has ZERO imports from:
 *   - Mongoose models (User, Trade, Wallet, Holding, Ledger, etc.)
 *   - Auth middleware or services
 *   - Wallet or trade execution services
 *   - Any existing controller
 *
 * It ONLY imports the Prisma client singleton.
 */

import { prisma } from "../../postgres/client.js";
import logger from "../../utils/logger.js";



// =============================================================================
// WRITE OPERATIONS (fire-and-forget, called by trade.controller.js only)
// =============================================================================

/**
 * Replicate a completed trade into the PostgreSQL analytics layer.
 *
 * MUST be called as:
 *   replicateTradeAnalytics({...}).catch(() => {}); // fire-and-forget
 * NEVER as:
 *   await replicateTradeAnalytics({...});           // would block trade response
 *
 * @param {Object} params
 * @param {string} params.userId   - MongoDB userId (stored as String in PG)
 * @param {string} params.tradeId  - MongoDB Trade._id (stored as String in PG)
 * @param {string} params.asset    - Coin ticker e.g. "BTC"
 * @param {string} params.tradeType - "BUY" | "SELL"
 * @param {number} params.amount   - totalValue in USD
 * @param {number} params.pnl      - realisedPnL (0 for BUY trades)
 */
export async function replicateTradeAnalytics({ userId, tradeId, asset, tradeType, amount, pnl }) {

  try {
    await prisma.tradeAnalytics.create({
      data: {
        userId:    String(userId),
        tradeId:   String(tradeId),
        asset:     String(asset).toUpperCase(),
        tradeType: String(tradeType).toUpperCase(),
        amount:    Number(amount)  || 0,
        pnl:       Number(pnl)     || 0,
      },
    });
    logger.debug("[Analytics] Trade replicated to PostgreSQL", { tradeId, asset, tradeType });
  } catch (err) {
    // Non-fatal — analytics failure NEVER affects trade execution
    logger.warn("[Analytics] PostgreSQL write failed (non-critical)", { error: err.message, tradeId });
  }
}

/**
 * Write an audit log entry to PostgreSQL.
 *
 * MUST also be called fire-and-forget:
 *   writeAuditLog({...}).catch(() => {});
 *
 * @param {string} userId
 * @param {string} action   - e.g. "TRADE_BUY", "TRADE_SELL", "CLOSE_POSITION"
 * @param {Object} metadata - Additional context (will be JSON.stringified)
 */
export async function writeAuditLog(userId, action, metadata = {}) {

  try {
    await prisma.auditLog.create({
      data: {
        userId:   String(userId),
        action:   String(action).toUpperCase(),
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (err) {
    logger.warn("[Analytics] AuditLog write failed (non-critical)", { error: err.message, userId, action });
  }
}

// =============================================================================
// READ OPERATIONS (used by analytics controller only)
// =============================================================================

/**
 * Aggregate total realised P&L for a user, optionally filtered by date range.
 *
 * @param {string}  userId
 * @param {Object}  opts
 * @param {string}  [opts.startDate] - ISO date string
 * @param {string}  [opts.endDate]   - ISO date string
 * @returns {Promise<{ totalPnL: number, tradeCount: number }>}
 */
export async function getPnlSummary(userId, { startDate, endDate } = {}) {

  try {
    const where = { userId: String(userId), tradeType: "SELL" };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate)   where.createdAt.lte = new Date(endDate);
    }

    const result = await prisma.tradeAnalytics.aggregate({
      where,
      _sum:   { pnl: true },
      _count: { id: true },
    });

    return {
      totalPnL:   result._sum.pnl   || 0,
      tradeCount: result._count.id  || 0,
      source: "postgresql",
    };
  } catch (err) {
    logger.warn("[Analytics] getPnlSummary failed", { error: err.message });
    return { totalPnL: 0, tradeCount: 0, source: "error" };
  }
}

/**
 * Aggregate monthly trading volume and P&L for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getMonthlyStats(userId) {

  try {
    // Group by year-month using raw SQL for portability
    const rows = await prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM')  AS month,
        SUM(CASE WHEN "tradeType" = 'BUY'  THEN amount ELSE 0 END) AS "buyVolume",
        SUM(CASE WHEN "tradeType" = 'SELL' THEN amount ELSE 0 END) AS "sellVolume",
        SUM(pnl)                                                    AS "totalPnL",
        COUNT(*)                                                     AS "tradeCount"
      FROM "TradeAnalytics"
      WHERE "userId" = ${String(userId)}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;
    return rows;
  } catch (err) {
    logger.warn("[Analytics] getMonthlyStats failed", { error: err.message });
    return [];
  }
}

/**
 * Return the top traded assets by volume (USD) for a user.
 *
 * @param {string} userId
 * @param {number} [topN=5]
 * @returns {Promise<Array>}
 */
export async function getTopAssets(userId, topN = 5) {

  try {
    const rows = await prisma.tradeAnalytics.groupBy({
      by:      ["asset"],
      where:   { userId: String(userId) },
      _sum:    { amount: true, pnl: true },
      _count:  { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take:    topN,
    });

    return rows.map(r => ({
      asset:       r.asset,
      totalVolume: r._sum.amount || 0,
      totalPnL:    r._sum.pnl   || 0,
      tradeCount:  r._count.id  || 0,
    }));
  } catch (err) {
    logger.warn("[Analytics] getTopAssets failed", { error: err.message });
    return [];
  }
}
