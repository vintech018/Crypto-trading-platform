/**
 * spot.routes.js  — Trading endpoints (BUY / SELL / DEPOSIT)
 *
 * POST /api/trade/buy
 * POST /api/trade/sell
 * POST /api/trade/deposit
 *
 * Middleware chain (additive — existing handlers unchanged):
 *   tradeRateLimiter → authenticate → idempotency → validateTrade → ctrl.*
 */

import { Router }       from "express";
import * as ctrl        from "../controllers/trade.controller.js";
import { closeTrade }   from "../controllers/closePosition.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  validateTrade,
  validateDeposit,
  validateCloseTrade,
} from "../middlewares/validate.middleware.js";
import { tradeRateLimiter } from "../middlewares/tradeRateLimiter.middleware.js";
import { idempotency }      from "../middlewares/idempotency.middleware.js";


const router = Router();

// ── Rate limiting (applied before auth — fails fast on abuse) ──────────────
router.use(tradeRateLimiter);

// ── All trade routes require authentication ────────────────────────────────
router.use(authenticate);

// ── Idempotency (applied after auth so req.user is available) ─────────────
router.use(idempotency);

router.post("/buy",     validateTrade,   ctrl.buy);
router.post("/sell",    validateTrade,   ctrl.sell);
router.post("/close",   validateCloseTrade, closeTrade);
router.post("/deposit", validateDeposit, ctrl.deposit);
router.get("/history",  ctrl.tradeHistory);
router.get("/summary",  ctrl.tradeSummary);


export default router;

