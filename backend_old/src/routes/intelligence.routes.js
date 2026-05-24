import express from 'express';
import rateLimit from 'express-rate-limit';
import { SignalSnapshot } from '../models/SignalSnapshot.model.js';
import { getMultiFactorSignals } from '../services/multiFactorSignalEngine.js';
import { getHistoricalConfidence } from '../services/confidenceEngine.js';
import { runBacktest } from '../services/backtestEngine.js';

const router = express.Router();

const intelligenceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: { success: false, message: "Too many requests, please try again later." }
});

// Apply rate limiter to all intelligence routes
router.use(intelligenceLimiter);

const getLatestSnapshot = async () => {
  return await SignalSnapshot.findOne().sort({ timestamp: -1 });
};

// GET /api/intelligence/signals
router.get('/signals', async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) return res.json({ success: true, data: [] });
    res.json({ success: true, data: snapshot.signals, timestamp: snapshot.timestamp });
  } catch (error) {
    console.error("Error fetching signals:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/intelligence/trends
router.get('/trends', async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) return res.json({ success: true, data: [] });
    res.json({ success: true, data: snapshot.trending, timestamp: snapshot.timestamp });
  } catch (error) {
    console.error("Error fetching trends:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/intelligence/correlation
router.get('/correlation', async (req, res) => {
  try {
    const snapshot = await getLatestSnapshot();
    if (!snapshot) return res.json({ success: true, data: [] });
    res.json({ success: true, data: snapshot.correlations, timestamp: snapshot.timestamp });
  } catch (error) {
    console.error("Error fetching correlation:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/intelligence/multifactor
router.get('/multifactor', async (req, res) => {
  try {
    const signals = await getMultiFactorSignals();
    res.json({ success: true, data: signals });
  } catch (error) {
    console.error("Error calculating multifactor signals:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/intelligence/confidence
router.get('/confidence', async (req, res) => {
  try {
    const confidence = await getHistoricalConfidence();
    res.json({ success: true, data: confidence });
  } catch (error) {
    console.error("Error fetching confidence:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/intelligence/backtest/:asset
router.get('/backtest/:asset', async (req, res) => {
  try {
    const { asset } = req.params;
    const days = parseInt(req.query.days) || 30;
    const backtestResult = await runBacktest(asset, days);
    res.json({ success: true, data: backtestResult });
  } catch (error) {
    console.error("Error running backtest:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
