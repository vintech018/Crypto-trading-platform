/**
 * analytics.routes.js — NEW isolated analytics route module
 *
 * ⚠️  ARCHITECTURE NOTE:
 *     These are BRAND NEW routes that do NOT overlap with any existing route.
 *     No existing route file was modified to create these endpoints.
 *
 * Mounted at: /api/analytics (in app.js)
 *
 *   GET /api/analytics/pnl         → P&L summary from PostgreSQL
 *   GET /api/analytics/monthly     → Monthly stats from PostgreSQL
 *   GET /api/analytics/top-assets  → Top assets by volume from PostgreSQL
 *
 * All routes protected by the existing `authenticate` middleware.
 * No changes to auth, CORS, or any existing middleware were made.
 */

import { Router }       from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  analyticsGetPnl,
  analyticsGetMonthly,
  analyticsGetTopAssets,
  analyticsGetDashboard,
  analyticsGetPortfolioHistory,
  analyticsGetDailyPnL,
  analyticsGetAssets,
  analyticsGetStats,
  analyticsGetHealth,
  analyticsGetQueueStats
} from "../controllers/analytics.controller.js";

const router = Router();

// All analytics endpoints require a valid JWT (reuses existing middleware)
router.use(authenticate);

router.get("/pnl",         analyticsGetPnl);
router.get("/monthly",     analyticsGetMonthly);
router.get("/top-assets",  analyticsGetTopAssets);

router.get("/dashboard",         analyticsGetDashboard);
router.get("/portfolio-history",  analyticsGetPortfolioHistory);
router.get("/daily-pnl",          analyticsGetDailyPnL);
router.get("/assets",             analyticsGetAssets);
router.get("/stats",              analyticsGetStats);

router.get("/health",             analyticsGetHealth);
router.get("/queue-stats",        analyticsGetQueueStats);

export default router;
