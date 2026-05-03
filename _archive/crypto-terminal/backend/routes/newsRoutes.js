const express = require("express");
const { fetchLatestNews } = require("../services/newsService");

const router = express.Router();

router.get("/latest", async (_req, res, next) => {
  try {
    const news = await fetchLatestNews(20);
    res.json({ data: news, refreshedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
