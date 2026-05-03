/**
 * excel.service.js — Multi-sheet Excel report generator
 *
 * Uses ExcelJS (Apache POI-compatible .xlsx format).
 * Writes directly to the Express response stream — no temp files.
 *
 * Sheets:
 *   1. Summary     — key financial figures + date range
 *   2. Portfolio   — open positions with live P/L
 *   3. Trades      — full trade history with realised P/L
 *   4. Ledger      — every financial transaction
 */

import ExcelJS from "exceljs";

// ─── Style tokens ──────────────────────────────────────────────────────────

const COLORS = {
  headerBg:   "FF111111",
  headerFont: "FFFFFFFF",
  positiveBg: "FFD4EDDA",
  negativeBg: "FFF8D7DA",
  subHeaderBg:"FF1A1A2E",
  borderColor:"FFD0D0D0",
  altRowBg:   "FFF9F9F9",
};

const FONT_BASE   = { name: "Calibri", size: 10 };
const FONT_HEADER = { ...FONT_BASE, bold: true, color: { argb: COLORS.headerFont } };
const FONT_TITLE  = { name: "Calibri", size: 14, bold: true };
const FILL_HEADER = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } };
const BORDER_THIN = {
  top:    { style: "thin", color: { argb: COLORS.borderColor } },
  left:   { style: "thin", color: { argb: COLORS.borderColor } },
  bottom: { style: "thin", color: { argb: COLORS.borderColor } },
  right:  { style: "thin", color: { argb: COLORS.borderColor } },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.font      = FONT_HEADER;
    cell.fill      = FILL_HEADER;
    cell.border    = BORDER_THIN;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  row.height = 20;
}

function styleDataRow(row, rowIndex) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.border    = BORDER_THIN;
    cell.alignment = { vertical: "middle" };
    if (rowIndex % 2 === 0) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.altRowBg } };
    }
  });
}

function applyPnLColour(cell, value) {
  if (value == null || value === "") return;
  const isPos = Number(value) >= 0;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isPos ? COLORS.positiveBg : COLORS.negativeBg } };
  cell.font = { ...FONT_BASE, color: { argb: isPos ? "FF155724" : "FF721C24" }, bold: true };
}

function addSheet(wb, name) {
  return wb.addWorksheet(name, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    headerFooter: { oddFooter: `SOLIDUS Financial Report — ${name} — Page &P of &N` },
  });
}

// ─── Sheet builders ────────────────────────────────────────────────────────

function buildSummarySheet(wb, data) {
  const ws = addSheet(wb, "Summary");

  ws.mergeCells("A1:C1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "SOLIDUS — Financial Report";
  titleCell.font  = FONT_TITLE;
  titleCell.alignment = { horizontal: "left" };
  ws.getRow(1).height = 28;

  const metaRows = [
    ["Generated",    data.meta.generatedAt],
    ["User",         `${data.meta.userName} <${data.meta.userEmail}>`],
    ["Period",       data.meta.startDate ? `${data.meta.startDate} → ${data.meta.endDate ?? "now"}` : "All time"],
    ["Asset Filter", data.meta.asset ?? "All assets"],
  ];

  let r = 2;
  for (const [label, value] of metaRows) {
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`A${r}`).font  = { ...FONT_BASE, bold: true };
    ws.getCell(`B${r}`).value = value;
    ws.getCell(`B${r}`).font  = FONT_BASE;
    ws.getRow(r).height = 16;
    r++;
  }
  r++;

  // Section heading
  ws.mergeCells(`A${r}:C${r}`);
  ws.getCell(`A${r}`).value = "Key Metrics";
  ws.getCell(`A${r}`).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.subHeaderBg } };
  ws.getCell(`A${r}`).font  = { ...FONT_HEADER, size: 11 };
  ws.getRow(r).height = 20;
  r++;

  const metrics = [
    ["Total Trades",     data.summary.totalTrades,    null],
    ["Buy Orders",       data.summary.buyCount,       null],
    ["Sell Orders",      data.summary.sellCount,      null],
    ["Total Invested",   data.summary.totalInvested,  "currency"],
    ["Portfolio Value",  data.summary.portfolioValue, "currency"],
    ["Realised P/L",     data.summary.realisedPnL,   "pnl"],
    ["Unrealised P/L",   data.summary.unrealisedPnL, "pnl"],
    ["Total P/L",        data.summary.totalPnL,       "pnl"],
  ];

  for (const [label, value, fmt] of metrics) {
    ws.getCell(`A${r}`).value  = label;
    ws.getCell(`A${r}`).font   = { ...FONT_BASE, bold: true };
    ws.getCell(`A${r}`).border = BORDER_THIN;
    ws.getCell(`B${r}`).value  = value;
    ws.getCell(`B${r}`).font   = FONT_BASE;
    ws.getCell(`B${r}`).border = BORDER_THIN;

    if (fmt === "currency") ws.getCell(`B${r}`).numFmt = '"$"#,##0.00';
    if (fmt === "pnl") {
      ws.getCell(`B${r}`).numFmt = '"$"#,##0.00;[Red]"$"-#,##0.00';
      applyPnLColour(ws.getCell(`B${r}`), value);
    }
    ws.getRow(r).height = 18;
    r++;
  }

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 28;
}

function buildPortfolioSheet(wb, data) {
  const ws = addSheet(wb, "Portfolio");
  ws.columns = [
    { header: "Asset",          width: 10 },
    { header: "Quantity",       width: 20 },
    { header: "Avg Buy Price",  width: 16 },
    { header: "Current Price",  width: 16 },
    { header: "Current Value",  width: 16 },
    { header: "Total Cost",     width: 14 },
    { header: "Unrealised P/L", width: 16 },
    { header: "P/L %",          width: 10 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  if (data.portfolio.length === 0) {
    ws.addRow(["No open positions."]);
    return;
  }

  data.portfolio.forEach((h, i) => {
    const row = ws.addRow([h.coin, h.quantity, h.avgBuyPrice, h.currentPrice, h.currentValue, h.totalCost, h.unrealisedPnL, h.pnlPercent]);
    row.getCell(2).numFmt = "#,##0.000000##";
    row.getCell(3).numFmt = '"$"#,##0.00########';
    row.getCell(4).numFmt = '"$"#,##0.00';
    row.getCell(5).numFmt = '"$"#,##0.00';
    row.getCell(6).numFmt = '"$"#,##0.00';
    row.getCell(7).numFmt = '"$"#,##0.00;[Red]"$"-#,##0.00';
    row.getCell(8).numFmt = '#,##0.00"%"';
    applyPnLColour(row.getCell(7), h.unrealisedPnL);
    applyPnLColour(row.getCell(8), h.pnlPercent);
    styleDataRow(row, i);
  });
}

function buildTradesSheet(wb, data) {
  const ws = addSheet(wb, "Trades");
  ws.columns = [
    { header: "Date (UTC)",    width: 22 },
    { header: "Asset",         width: 8  },
    { header: "Type",          width: 8  },
    { header: "Quantity",      width: 20 },
    { header: "Price (USD)",   width: 16 },
    { header: "Total Value",   width: 14 },
    { header: "Avg Buy Price", width: 14 },
    { header: "Realised P/L",  width: 14 },
    { header: "Trade ID",      width: 26 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  if (data.trades.length === 0) {
    ws.addRow(["No trades in this period."]);
    return;
  }

  const typeColor = { BUY: "FF155724", SELL: "FF721C24" };

  data.trades.forEach((t, i) => {
    const row = ws.addRow([t.date, t.coin, t.type, t.quantity, t.price, t.totalValue, t.avgBuyPrice ?? "—", t.realisedPnL ?? "—", t.tradeId]);
    row.getCell(4).numFmt = "#,##0.000000##";
    row.getCell(5).numFmt = '"$"#,##0.00########';
    row.getCell(6).numFmt = '"$"#,##0.00';
    row.getCell(7).numFmt = '"$"#,##0.00########';
    if (t.realisedPnL != null) {
      row.getCell(8).numFmt = '"$"#,##0.00;[Red]"$"-#,##0.00';
      applyPnLColour(row.getCell(8), t.realisedPnL);
    }
    row.getCell(3).font = { ...FONT_BASE, bold: true, color: { argb: typeColor[t.type] ?? "FF000000" } };
    styleDataRow(row, i);
  });
}

function buildLedgerSheet(wb, data) {
  const ws = addSheet(wb, "Ledger");
  ws.columns = [
    { header: "Date (UTC)",     width: 22 },
    { header: "Type",           width: 10 },
    { header: "Amount",         width: 16 },
    { header: "Asset",          width: 8  },
    { header: "Bal. Before",    width: 14 },
    { header: "Bal. After",     width: 14 },
    { header: "Reference ID",   width: 26 },
    { header: "Note",           width: 44 },
  ];
  styleHeaderRow(ws.getRow(1));
  ws.views = [{ state: "frozen", ySplit: 1 }];

  if (data.ledger.length === 0) {
    ws.addRow(["No ledger entries in this period."]);
    return;
  }

  const typeColor = { DEPOSIT: "FF155724", BUY: "FF004085", SELL: "FF721C24", WITHDRAW: "FF856404", FEE: "FF383D41" };

  data.ledger.forEach((e, i) => {
    const row = ws.addRow([e.date, e.type, e.amount, e.asset, e.balanceBefore ?? "—", e.balanceAfter ?? "—", e.referenceId ?? "—", e.note ?? "—"]);
    row.getCell(3).numFmt = "#,##0.00########";
    if (e.balanceBefore != null) row.getCell(5).numFmt = '"$"#,##0.00';
    if (e.balanceAfter  != null) row.getCell(6).numFmt = '"$"#,##0.00';
    row.getCell(2).font = { ...FONT_BASE, bold: true, color: { argb: typeColor[e.type] ?? "FF000000" } };
    styleDataRow(row, i);
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────

/**
 * Stream the workbook directly to the Express response.
 * @param {import('express').Response} res
 * @param {object} data — from export.service.getReportData()
 */
export async function generateExcel(res, data) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "SOLIDUS Trading Platform";
  wb.created  = new Date();
  wb.modified = new Date();

  buildSummarySheet(wb, data);
  buildPortfolioSheet(wb, data);
  buildTradesSheet(wb, data);
  buildLedgerSheet(wb, data);

  const filename = `${data.meta.fileSlug}.xlsx`;
  res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control",       "no-store");
  res.setHeader("X-Report-Generated",  data.meta.generatedAt);

  await wb.xlsx.write(res);
  res.end();
}
