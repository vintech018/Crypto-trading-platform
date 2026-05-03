/**
 * user.routes.js — Thin user profile route
 *
 * GET /api/user/portfolio   → portfolio with live P/L
 */

import { Router }       from "express";
import { portfolio }    from "../controllers/portfolio.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/portfolio", portfolio);

export default router;
