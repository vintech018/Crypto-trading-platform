/**
 * spot.routes.js  — Trading endpoints (BUY / SELL / DEPOSIT)
 *
 * POST /api/trade/buy
 * POST /api/trade/sell
 * POST /api/trade/deposit
 */

import { Router }       from "express";
import * as ctrl        from "../controllers/trade.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  validateTrade,
  validateDeposit,
} from "../middlewares/validate.middleware.js";


const router = Router();

// All trade routes require authentication
router.use(authenticate);

router.post("/buy",     validateTrade,   ctrl.buy);
router.post("/sell",    validateTrade,   ctrl.sell);
router.post("/deposit", validateDeposit, ctrl.deposit);
router.get("/history",  ctrl.tradeHistory);
router.get("/summary",  ctrl.tradeSummary);


export default router;
