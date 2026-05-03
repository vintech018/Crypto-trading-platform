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
 */

import { Router }       from "express";
import * as ctrl        from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// ── Public endpoints (chart data, order book snapshot) ─────────────────────
router.get("/book/:coin",     ctrl.getOrderBook);
router.get("/candles/:coin",  ctrl.getOHLC);

// ── Authenticated endpoints ─────────────────────────────────────────────────
router.use(authenticate);

router.post("/",              ctrl.placeOrder);
router.get("/",               ctrl.getOrders);
router.delete("/:orderId",    ctrl.cancelOrder);
router.get("/trades",         ctrl.getTradeHistory);

export default router;
