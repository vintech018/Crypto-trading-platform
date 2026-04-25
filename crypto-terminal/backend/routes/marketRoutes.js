const express = require("express");
const { z } = require("zod");
const {
  getLatestPrices,
  fetchCandles,
  getWhaleAlerts,
  fetch24hTicker,
} = require("../services/marketService");
const { DEFAULT_INTERVALS } = require("../config/constants");

const router = express.Router();

router.get("/prices", (_req, res) => {
  res.json({ data: getLatestPrices(), timestamp: Date.now() });
});

router.get("/candles", async (req, res, next) => {
  try {
    const schema = z.object({
      symbol: z.string().trim().min(6).max(12).toUpperCase(),
      interval: z.enum(DEFAULT_INTERVALS),
      limit: z.coerce.number().min(1).max(500).default(150),
    });

    const params = schema.parse(req.query);
    const data = await fetchCandles(params);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/ticker/:symbol", async (req, res, next) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!symbol) {
      return res.status(400).json({ error: "Invalid symbol" });
    }

    const data = await fetch24hTicker(symbol);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/alerts/whales", (_req, res) => {
  res.json({ data: getWhaleAlerts() });
});

module.exports = router;
