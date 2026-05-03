/**
 * report.routes.js
 *
 *   GET /api/reports                    → JSON financial report
 *   GET /api/reports/export/excel       → .xlsx file download
 *   GET /api/reports/export/pdf         → .pdf file download
 *
 * All endpoints:
 *   - require authentication (Bearer JWT)
 *   - accept query: startDate, endDate, asset
 */

import { Router }               from "express";
import { report, exportExcel, exportPDF } from "../controllers/report.controller.js";
import { authenticate }         from "../middlewares/auth.middleware.js";
import { validateReportQuery }  from "../middlewares/validate.middleware.js";

const router = Router();

router.use(authenticate);
router.use(validateReportQuery);

router.get("/",               report);
router.get("/export/excel",   exportExcel);
router.get("/export/pdf",     exportPDF);
router.get("/pnl",            exportPDF); // Alias requested by user

export default router;
