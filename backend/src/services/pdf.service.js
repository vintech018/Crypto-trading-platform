/**
 * pdf.service.js — Professional PDF report generator using PDFKit
 *
 * Layout (portrait A4 — 595pt wide):
 *   Page 1: Cover (logo, user name, period, generation timestamp)
 *   Page 2: Summary metrics (key/value table)
 *   Page 3+: Portfolio positions table
 *   Continued: Trade history table (paginated)
 *   Continued: Ledger table (paginated)
 *
 * Design:
 *   - Dark header bar with white text
 *   - Alternating row shading
 *   - Color-coded P/L (green / red)
 *   - Automatic page breaks — no row is ever clipped
 *   - Page numbers in footer
 *
 * Streams directly to Express response — no temp files.
 */

import PDFDocument from "pdfkit";

// ─── Design constants ──────────────────────────────────────────────────────

const PAGE_WIDTH  = 595.28;     // A4 portrait
const PAGE_HEIGHT = 841.89;
const MARGIN      = 40;
const CONTENT_W   = PAGE_WIDTH - MARGIN * 2;
const FOOTER_H    = 30;

const COLORS = {
  brand:      "#FFFFFF",
  brandBg:    "#0D0D0D",
  accent:     "#6366F1",         // indigo
  positive:   "#15803D",
  negative:   "#DC2626",
  headerBg:   "#111111",
  headerText: "#FFFFFF",
  altRow:     "#F5F5F5",
  border:     "#E0E0E0",
  text:       "#1A1A1A",
  muted:      "#6B7280",
  sectionBg:  "#1A1A2E",
};

const FONT = {
  regular: "Helvetica",
  bold:    "Helvetica-Bold",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function usd(n) {
  if (n == null) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function qty(n, dp = 6) {
  if (n == null) return "—";
  return Number(n).toFixed(dp);
}

function pct(n) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
}

function pnlColor(n) {
  if (n == null || n === 0) return COLORS.text;
  return n > 0 ? COLORS.positive : COLORS.negative;
}

// ─── PDF drawing primitives ────────────────────────────────────────────────

/**
 * Draw bottom border below current Y and add page number footer.
 */
function drawFooter(doc, pageNum) {
  const y = PAGE_HEIGHT - FOOTER_H;
  doc.save()
    .moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke()
    .font(FONT.regular).fontSize(8).fillColor(COLORS.muted)
    .text(
      `SOLIDUS Financial Report  ·  Generated ${new Date().toUTCString()}  ·  Page ${pageNum}`,
      MARGIN, y + 8,
      { width: CONTENT_W, align: "center" }
    )
    .restore();
}

/**
 * Draw a coloured section heading bar.
 */
function drawSectionHeading(doc, title, y) {
  doc.save()
    .rect(MARGIN, y, CONTENT_W, 22)
    .fill(COLORS.sectionBg)
    .font(FONT.bold).fontSize(11)
    .fillColor(COLORS.headerText)
    .text(title, MARGIN + 8, y + 5, { width: CONTENT_W - 16 })
    .restore();
  return y + 30;
}

/**
 * Draw a key-value row (label | value).
 */
function drawKVRow(doc, label, value, y, { valueColor = COLORS.text } = {}) {
  doc.save()
    .font(FONT.bold).fontSize(9).fillColor(COLORS.muted)
    .text(label, MARGIN + 4, y + 3, { width: 160 })
    .font(FONT.regular).fontSize(9).fillColor(valueColor)
    .text(String(value), MARGIN + 170, y + 3, { width: CONTENT_W - 174 })
    .restore();
  return y + 18;
}

/**
 * Draw the header row for a table.
 * @param {string[]} headers
 * @param {number[]} widths    — column widths that sum to CONTENT_W
 */
function drawTableHeader(doc, headers, widths, y) {
  doc.save()
    .rect(MARGIN, y, CONTENT_W, 18)
    .fill(COLORS.headerBg);

  let x = MARGIN + 4;
  headers.forEach((h, i) => {
    doc.font(FONT.bold).fontSize(8).fillColor(COLORS.headerText)
      .text(h, x, y + 4, { width: widths[i] - 4, align: i > 1 ? "right" : "left" });
    x += widths[i];
  });
  doc.restore();
  return y + 20;
}

/**
 * Draw one data row.
 * @param {string[]} cells      — text for each column
 * @param {string[]} cellColors — per-cell fill colour (null = default)
 * @param {number}   rowIndex   — for alternating rows
 */
function drawTableRow(doc, cells, widths, y, rowIndex, cellColors = []) {
  const h = 15;
  const bg = rowIndex % 2 === 0 ? COLORS.altRow : COLORS.brand;
  doc.save().rect(MARGIN, y, CONTENT_W, h).fill(bg).restore();

  let x = MARGIN + 4;
  cells.forEach((cell, i) => {
    const color = cellColors[i] ?? COLORS.text;
    doc.save()
      .font(FONT.regular).fontSize(8).fillColor(color)
      .text(String(cell ?? "—"), x, y + 2, { width: widths[i] - 4, align: i > 1 ? "right" : "left", ellipsis: true })
      .restore();
    x += widths[i];
  });

  return y + h;
}

// ─── Page sections ─────────────────────────────────────────────────────────

function drawCoverPage(doc, meta) {
  // Full-width dark header block
  doc.save()
    .rect(0, 0, PAGE_WIDTH, 180).fill(COLORS.brandBg)
    .restore();

  // Logo text
  doc.save()
    .font(FONT.bold).fontSize(42).fillColor(COLORS.brand)
    .text("SOLIDUS", MARGIN, 55, { width: CONTENT_W })
    .font(FONT.regular).fontSize(13).fillColor("#888888")
    .text("Financial Report", MARGIN, 105, { width: CONTENT_W })
    .restore();

  // Accent line
  doc.save()
    .moveTo(MARGIN, 140).lineTo(MARGIN + 60, 140)
    .strokeColor(COLORS.accent).lineWidth(3).stroke()
    .restore();

  let y = 220;
  const details = [
    ["Report Prepared For", `${meta.userName}  ·  ${meta.userEmail}`],
    ["Period",              meta.startDate ? `${meta.startDate}  →  ${meta.endDate ?? "present"}` : "All time"],
    ["Asset Filter",        meta.asset ?? "All assets"],
    ["Generated At",        meta.generatedAt],
  ];
  for (const [label, value] of details) {
    doc.save()
      .font(FONT.bold).fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), MARGIN, y, { letterSpacing: 1 })
      .font(FONT.regular).fontSize(11).fillColor(COLORS.text).text(value, MARGIN, y + 12)
      .restore();
    y += 44;

    doc.save()
      .moveTo(MARGIN, y - 8).lineTo(MARGIN + CONTENT_W, y - 8)
      .strokeColor(COLORS.border).lineWidth(0.4).stroke()
      .restore();
  }

  // Disclaimer
  doc.save()
    .font(FONT.regular).fontSize(7).fillColor(COLORS.muted)
    .text(
      "This report is for informational purposes only. All figures are based on recorded trade executions and live market prices at time of generation. Past performance does not guarantee future results.",
      MARGIN, PAGE_HEIGHT - 100, { width: CONTENT_W, align: "center" }
    )
    .restore();
}

function drawSummarySection(doc, summary, y) {
  y = drawSectionHeading(doc, "Key Financial Summary", y);

  const rows = [
    ["Total Trades",     String(summary.totalTrades),              null],
    ["Buy Orders",       String(summary.buyCount),                 null],
    ["Sell Orders",      String(summary.sellCount),                null],
    ["Total Invested",   usd(summary.totalInvested),               COLORS.text],
    ["Portfolio Value",  usd(summary.portfolioValue),              COLORS.text],
    ["Realised P/L",     usd(summary.realisedPnL),                 pnlColor(summary.realisedPnL)],
    ["Unrealised P/L",   usd(summary.unrealisedPnL),              pnlColor(summary.unrealisedPnL)],
    ["Total P/L",        `${usd(summary.totalPnL)} (${pct(summary.totalPnL > 0 ? (summary.totalPnL / Math.max(summary.totalInvested, 1)) * 100 : 0)})`,
                                                                    pnlColor(summary.totalPnL)],
  ];

  for (let i = 0; i < rows.length; i++) {
    const [label, value, color] = rows[i];
    const bg = i % 2 === 0 ? COLORS.altRow : COLORS.brand;
    doc.save().rect(MARGIN, y, CONTENT_W, 18).fill(bg).restore();
    y = drawKVRow(doc, label, value, y, { valueColor: color ?? COLORS.text });
    doc.save().moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).strokeColor(COLORS.border).lineWidth(0.3).stroke().restore();
  }
  return y + 16;
}

function drawPortfolioSection(doc, portfolio, startY) {
  let y = startY;
  y = drawSectionHeading(doc, "Portfolio Positions", y);

  if (portfolio.length === 0) {
    doc.font(FONT.regular).fontSize(9).fillColor(COLORS.muted)
      .text("No open positions.", MARGIN, y);
    return y + 20;
  }

  const W = [45, 85, 75, 75, 75, 70, 75, 65];  // 8 columns
  const headers = ["Asset", "Quantity", "Avg Buy $", "Current $", "Value", "Cost", "Unreal. P/L", "P/L %"];
  y = drawTableHeader(doc, headers, W, y);

  portfolio.forEach((h, i) => {
    if (y + 18 > PAGE_HEIGHT - FOOTER_H - 20) {
      doc.addPage();
      y = MARGIN;
      y = drawTableHeader(doc, headers, W, y);
    }
    const cells = [h.coin, qty(h.quantity, 6), usd(h.avgBuyPrice), usd(h.currentPrice), usd(h.currentValue), usd(h.totalCost), usd(h.unrealisedPnL), pct(h.pnlPercent)];
    const colors = [COLORS.text, COLORS.text, COLORS.text, COLORS.text, COLORS.text, COLORS.text, pnlColor(h.unrealisedPnL), pnlColor(h.pnlPercent)];
    y = drawTableRow(doc, cells, W, y, i, colors);
  });
  return y + 16;
}

function drawTradesSection(doc, trades, startY) {
  let y = startY;
  y = drawSectionHeading(doc, "Trade History", y);

  if (trades.length === 0) {
    doc.font(FONT.regular).fontSize(9).fillColor(COLORS.muted).text("No trades in this period.", MARGIN, y);
    return y + 20;
  }

  const W = [115, 40, 38, 80, 70, 70, 70, 32];  // 8 columns (drop Trade ID for space)
  const headers = ["Date", "Asset", "Type", "Quantity", "Price", "Total", "Avg Buy", "P/L"];
  y = drawTableHeader(doc, headers, W, y);

  trades.forEach((t, i) => {
    if (y + 18 > PAGE_HEIGHT - FOOTER_H - 20) {
      doc.addPage();
      y = MARGIN;
      y = drawTableHeader(doc, headers, W, y);
    }
    const cells = [t.date, t.coin, t.type, qty(t.quantity, 6), usd(t.price), usd(t.totalValue), usd(t.avgBuyPrice), t.realisedPnL != null ? usd(t.realisedPnL) : "—"];
    const colors = [COLORS.text, COLORS.text, t.type === "BUY" ? COLORS.positive : COLORS.negative, COLORS.text, COLORS.text, COLORS.text, COLORS.text, pnlColor(t.realisedPnL)];
    y = drawTableRow(doc, cells, W, y, i, colors);
  });
  return y + 16;
}

function drawLedgerSection(doc, ledger, startY) {
  let y = startY;
  y = drawSectionHeading(doc, "Ledger (Transaction History)", y);

  if (ledger.length === 0) {
    doc.font(FONT.regular).fontSize(9).fillColor(COLORS.muted).text("No ledger entries in this period.", MARGIN, y);
    return y + 20;
  }

  const W = [118, 50, 70, 45, 72, 72, 88];  // 7 columns
  const headers = ["Date", "Type", "Amount", "Asset", "Bal. Before", "Bal. After", "Reference"];
  y = drawTableHeader(doc, headers, W, y);

  const typeColor = { DEPOSIT: COLORS.positive, BUY: "#1D4ED8", SELL: COLORS.negative, WITHDRAW: "#92400E", FEE: COLORS.muted };

  ledger.forEach((e, i) => {
    if (y + 18 > PAGE_HEIGHT - FOOTER_H - 20) {
      doc.addPage();
      y = MARGIN;
      y = drawTableHeader(doc, headers, W, y);
    }
    const cells = [e.date, e.type, qty(e.amount, 6), e.asset, usd(e.balanceBefore), usd(e.balanceAfter), e.referenceId ?? "—"];
    const colors = [COLORS.text, typeColor[e.type] ?? COLORS.text, COLORS.text, COLORS.text, COLORS.text, COLORS.text, COLORS.muted];
    y = drawTableRow(doc, cells, W, y, i, colors);
  });
  return y + 16;
}

// ─── Main entry point ─────────────────────────────────────────────────────

/**
 * Stream a complete PDF report to the Express response.
 * @param {import('express').Response} res
 * @param {object} data — from export.service.getReportData()
 */
export function generatePDF(res, data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: FOOTER_H + 10, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
      bufferPages: true,                // required for page-number injection
      info: {
        Title:    "SOLIDUS Financial Report",
        Author:   data.meta.userName,
        Creator:  "SOLIDUS Trading Platform",
        Subject:  `Report for ${data.meta.startDate ?? "all time"} — ${data.meta.endDate ?? "present"}`,
      },
    });

    const filename = `${data.meta.fileSlug}.pdf`;
    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control",       "no-store");
    res.setHeader("X-Report-Generated",  data.meta.generatedAt);

    doc.pipe(res);
    doc.on("error", reject);
    res.on("error", reject);
    res.on("finish", resolve);

    // ── Page 1: Cover ─────────────────────────────────────────
    drawCoverPage(doc, data.meta);

    // ── Page 2: Summary + Portfolio ───────────────────────────
    doc.addPage();
    let y = MARGIN;
    y = drawSummarySection(doc, data.summary, y);
    y += 8;

    // Portfolio fits on same page if small enough
    if (y + data.portfolio.length * 16 + 60 > PAGE_HEIGHT - FOOTER_H) {
      doc.addPage();
      y = MARGIN;
    }
    y = drawPortfolioSection(doc, data.portfolio, y);

    // ── Trades section ─────────────────────────────────────────
    if (data.trades.length > 0) {
      if (y + 80 > PAGE_HEIGHT - FOOTER_H) {
        doc.addPage();
        y = MARGIN;
      }
      y = drawTradesSection(doc, data.trades, y);
    }

    // ── Ledger section ─────────────────────────────────────────
    if (data.ledger.length > 0) {
      if (y + 80 > PAGE_HEIGHT - FOOTER_H) {
        doc.addPage();
        y = MARGIN;
      }
      drawLedgerSection(doc, data.ledger, y);
    }

    // ── Inject page footers on all pages ───────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      if (i > 0) drawFooter(doc, i + 1);   // skip cover page footer
    }

    doc.flushPages();
    doc.end();
  });
}
