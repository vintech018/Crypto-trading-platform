/**
 * report.controller.js — Financial Report HTTP handlers
 *
 *   GET /api/reports              → JSON report (existing — unchanged)
 *   GET /api/reports/export/excel → .xlsx download
 *   GET /api/reports/export/pdf   → .pdf download
 *
 * Query params (all three endpoints):
 *   startDate  — ISO date string (inclusive), e.g. "2026-01-01"
 *   endDate    — ISO date string (inclusive, clamped to 23:59:59)
 *   asset      — uppercase coin ticker, e.g. "BTC" (optional)
 */

import { generateReport }  from "../services/report.service.js";
import { getReportData }   from "../services/export.service.js";
import { generateExcel }   from "../services/excel.service.js";
import { generatePDF }     from "../services/pdf.service.js";
import { sendSuccess }     from "../utils/helpers.js";
import logger              from "../utils/logger.js";

// ─── JSON report (original) ───────────────────────────────────────────────

/**
 * GET /api/reports?startDate=2026-01-01&endDate=2026-12-31
 */
export async function report(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await generateReport(req.user.id, startDate, endDate);
    return sendSuccess(res, 200, "Report generated.", data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/pnl
 * Returns high-level P/L engine calculation
 */
export async function getPnl(req, res, next) {
  try {
    const data = await generateReport(req.user.id);
    
    // We calculate totalBuy and totalSell from the monthly breakdown
    let totalBuy = 0;
    let totalSell = 0;
    for (const m of data.monthlyPerformance) {
      totalBuy += m.buyVolume;
      totalSell += m.sellVolume;
    }
    
    return sendSuccess(res, 200, "P/L calculated.", {
      totalBuy,
      totalSell,
      fees: 0, // No fees in system yet
      realizedPnL: data.summary.realisedPnL,
      unrealizedPnL: data.summary.unrealisedPnL,
      netPnL: data.summary.totalPnL
    });
  } catch (err) {
    next(err);
  }
}

// ─── Excel export ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/export/excel?startDate=&endDate=&asset=
 *
 * Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 * Content-Disposition: attachment; filename="report_2026-01-01_to_2026-03-01.xlsx"
 */
export async function exportExcel(req, res, next) {
  try {
    const { startDate, endDate, asset } = req.query;

    logger.info("Excel export requested", { userId: req.user.id, startDate, endDate, asset });

    const data = await getReportData(req.user.id, { startDate, endDate, asset });
    await generateExcel(res, data);
    // generateExcel calls res.end() — no further action needed
  } catch (err) {
    // If headers already sent (streaming started), can't send error JSON
    if (!res.headersSent) return next(err);
    logger.error("Excel export stream error", { error: err.message });
    res.destroy(err);
  }
}

// ─── PDF export ───────────────────────────────────────────────────────────

/**
 * GET /api/reports/export/pdf?startDate=&endDate=&asset=
 *
 * Response: application/pdf
 * Content-Disposition: attachment; filename="report_2026-01-01_to_2026-03-01.pdf"
 */
export async function exportPDF(req, res, next) {
  try {
    const { startDate, endDate, asset } = req.query;

    logger.info("PDF export requested", { userId: req.user.id, startDate, endDate, asset });

    const data = await getReportData(req.user.id, { startDate, endDate, asset });
    await generatePDF(res, data);
    // generatePDF resolves when the stream finishes
  } catch (err) {
    if (!res.headersSent) return next(err);
    logger.error("PDF export stream error", { error: err.message });
    res.destroy(err);
  }
}
