/**
 * wallet.routes.js — Wallet, Ledger & Audit endpoints
 *
 * All routes are protected by the authenticate middleware.
 *
 * GET  /api/wallet/balance          → cached wallet balance
 * GET  /api/wallet/derived-balance  → authoritative ledger-derived balance
 * GET  /api/wallet/ledger           → paginated transaction history (filterable)
 * GET  /api/wallet/audit            → drift check: cached vs derived
 */

import { Router }           from "express";
import {
  getBalance,
  getLedger,
  auditBalance,
  getDerivedBalance,
}                           from "../controllers/wallet.controller.js";
import { authenticate }     from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/balance",          getBalance);
router.get("/derived-balance",  getDerivedBalance);
router.get("/ledger",           getLedger);
router.get("/audit",            auditBalance);

export default router;
