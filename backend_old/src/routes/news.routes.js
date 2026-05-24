// backend/src/routes/news.routes.js
import express from 'express';
import { processAndStoreNews, getLatestNews, getLatestSignals } from '../services/news.service.js';
import { getTrendingAssets } from '../services/trendEngine.js';

const router = express.Router();

// Simple in-memory cache
const cache = {
  data: {},
  set: (key, value, ttlSeconds = 60) => {
    cache.data[key] = { value, expiry: Date.now() + ttlSeconds * 1000 };
  },
  get: (key) => {
    const item = cache.data[key];
    if (item && item.expiry > Date.now()) return item.value;
    return null;
  }
};

// GET /api/news/trending -> return top trending assets
router.get('/trending', async (req, res) => {
  try {
    const cacheKey = 'trending';
    let trending = cache.get(cacheKey);
    if (!trending) {
      trending = await getTrendingAssets();
      cache.set(cacheKey, trending, 300); // 5 min cache
    }
    res.json({ success: true, data: trending });
  } catch (error) {
    console.error("Error fetching trending news:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/news/signals -> return latest signals
router.get('/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cacheKey = `signals_${limit}`;
    let signals = cache.get(cacheKey);
    if (!signals) {
      signals = await getLatestSignals(limit);
      cache.set(cacheKey, signals, 60); // 1 min cache
    }
    res.json({ success: true, data: signals });
  } catch (error) {
    console.error("Error fetching signals:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/news/:asset -> filter news by asset (must be defined before / fetch so :asset isn't caught)
router.get('/:asset', async (req, res, next) => {
  // If the parameter is 'fetch', skip to the next route
  if (req.params.asset === 'fetch') return next();
  
  try {
    const asset = req.params.asset;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const cacheKey = `news_${asset}_${limit}_${page}`;
    
    let news = cache.get(cacheKey);
    if (!news) {
      news = await getLatestNews(limit, page, asset);
      cache.set(cacheKey, news, 60);
    }
    res.json({ success: true, data: news, page, limit });
  } catch (error) {
    console.error(`Error fetching news for asset ${req.params.asset}:`, error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET /api/news -> return latest stored news from DB
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const cacheKey = `news_all_${limit}_${page}`;
    
    let news = cache.get(cacheKey);
    if (!news) {
      news = await getLatestNews(limit, page);
      cache.set(cacheKey, news, 60); // 1 min cache
    }
    res.json({ success: true, data: news, page, limit });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// POST /api/news/fetch -> fetch + analyze + store news manually
router.post('/fetch', async (req, res) => {
  try {
    const savedCount = await processAndStoreNews();
    res.json({ success: true, message: `Fetched and saved ${savedCount} new articles.` });
  } catch (error) {
    console.error("Error triggering news fetch:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
