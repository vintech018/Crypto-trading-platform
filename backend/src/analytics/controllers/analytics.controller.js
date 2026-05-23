/**
 * analytics.controller.js — HTTP handlers for the analytics layer
 *
 * ⚠️  ARCHITECTURE NOTE:
 *     These handlers read ONLY from PostgreSQL (secondary analytics layer).
 *     They do NOT read from MongoDB and do NOT call any existing services
 *     (auth.service, trade.service, wallet.service, etc.).
 *
 * Routes served:
 *   GET /api/analytics/pnl          → total P&L summary for the user
 *   GET /api/analytics/monthly      → monthly volume + P&L breakdown
 *   GET /api/analytics/top-assets   → top assets by trade volume
 *
 * All routes require the existing JWT authenticate middleware.
 * req.user.id is set by that middleware — no changes to auth flow needed.
 */

import {
  getPnlSummary,
  getMonthlyStats,
  getTopAssets,
} from "../services/tradeAnalytics.service.js";
import {
  getDashboardSummary,
  getPortfolioHistory,
  getDailyPnLHistory,
  getAssetBreakdown,
  getTradingStats
} from "../services/analyticsRead.service.js";
import { sendSuccess } from "../../utils/helpers.js";
import AnalyticsEvent from "../../models/AnalyticsEvent.model.js";
import { prisma } from "../../postgres/client.js";
import { withCache } from "../../utils/cache.js";
import { analyticsQueue } from "../services/analyticsEmitter.js";

export async function analyticsGetPnl(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const cacheKey = `cache:analytics:pnl:${req.user.id}:${startDate || "all"}:${endDate || "all"}`;
    const data = await withCache(cacheKey, 60, () => getPnlSummary(req.user.id, { startDate, endDate }));
    return sendSuccess(res, 200, "Analytics P&L summary.", data);
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetMonthly(req, res, next) {
  try {
    const cacheKey = `cache:analytics:monthly:${req.user.id}`;
    const data = await withCache(cacheKey, 300, () => getMonthlyStats(req.user.id));
    return sendSuccess(res, 200, "Analytics monthly stats.", { months: data });
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetTopAssets(req, res, next) {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const cacheKey = `cache:analytics:top-assets:${req.user.id}:${limit}`;
    const data = await withCache(cacheKey, 300, () => getTopAssets(req.user.id, limit));
    return sendSuccess(res, 200, "Analytics top assets.", { assets: data });
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

const handlePrismaError = (res, err) => {
  if (err.name === "PrismaClientInitializationError" || err.code?.startsWith('P')) {
    return res.status(503).json({
      success: false,
      message: "Analytics service is temporarily degraded. Trading is unaffected.",
      data: null
    });
  }
  throw err;
};

export async function analyticsGetDashboard(req, res, next) {
  try {
    const cacheKey = `cache:analytics:dashboard:${req.user.id}`;
    const data = await withCache(cacheKey, 60, () => getDashboardSummary(req.user.id));
    return sendSuccess(res, 200, "Analytics dashboard summary.", data);
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetPortfolioHistory(req, res, next) {
  try {
    const data = await getPortfolioHistory(req.user.id, req.query.days);
    return sendSuccess(res, 200, "Portfolio history.", data);
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetDailyPnL(req, res, next) {
  try {
    const data = await getDailyPnLHistory(req.user.id, req.query.days);
    return sendSuccess(res, 200, "Daily PnL history.", data);
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetAssets(req, res, next) {
  try {
    const data = await getAssetBreakdown(req.user.id);
    return sendSuccess(res, 200, "Asset breakdown.", data);
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetStats(req, res, next) {
  try {
    const data = await getTradingStats(req.user.id);
    return sendSuccess(res, 200, "Trading stats.", data);
  } catch (err) {
    try { handlePrismaError(res, err); } catch(e) { next(e); }
  }
}

export async function analyticsGetHealth(req, res, next) {
  try {
    return sendSuccess(res, 200, "Analytics health status.", {
      postgresqlAvailable: true,
      workerStatus: "active"
    });
  } catch (err) {
    next(err);
  }
}

export async function analyticsGetQueueStats(req, res, next) {
  try {
    const jobCounts = await analyticsQueue.getJobCounts();

    return sendSuccess(res, 200, "Analytics queue stats.", {
      pendingQueueSize: jobCounts.waiting || 0,
      failedQueueSize: jobCounts.failed || 0,
      activeQueueSize: jobCounts.active || 0,
      processingRate: "BullMQ managed concurrency"
    });
  } catch (err) {
    next(err);
  }
}
