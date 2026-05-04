/**
 * order.routes.js — Order book, trade history, and OHLC chart endpoints
 *
 * POST   /api/orders             → place a limit order
 * GET    /api/orders             → user's active orders
 * DELETE /api/orders/:orderId    → cancel an order
 * GET    /api/orders/book/:coin  → order book snapshot (platform-internal)
 * GET    /api/orders/trades      → user's trade history (filterable)
 * GET    /api/orders/candles/:coin → OHLC chart data
 *
 * Note: /candles and /book are public (no auth required) to support
 * lightweight widgets and external data integrations.
 *
 * Middleware chain for POST / (additive — existing handlers unchanged):
 *   tradeRateLimiter → authenticate → idempotency → validateOrder → ctrl.placeOrder
 */

import { Router }       from "express";
import * as ctrl        from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateOrder } from "../middlewares/validate.middleware.js";
import { tradeRateLimiter } from "../middlewares/tradeRateLimiter.middleware.js";
import { idempotency }      from "../middlewares/idempotency.middleware.js";

const router = Router();

// ── Rate limiting on order endpoints (applied globally to this router) ─────
router.use(tradeRateLimiter);

// ── Public endpoints (chart data, order book snapshot) ─────────────────────
router.get("/book/:coin",     ctrl.getOrderBook);
router.get("/candles/:coin",  ctrl.getOHLC);

// ── Authenticated endpoints ─────────────────────────────────────────────────
router.use(authenticate);

// ── Idempotency guard (after auth — req.user is available) ─────────────────
router.use(idempotency);

router.post("/",              validateOrder, ctrl.placeOrder);
router.get("/",               ctrl.getOrders);
router.delete("/:orderId",    ctrl.cancelOrder);
router.get("/trades",         ctrl.getTradeHistory);

export default router;

