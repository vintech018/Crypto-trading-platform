const express = require("express");
const { fetchPortfolio } = require("../services/portfolioService");

const router = express.Router();

router.get("/:address", async (req, res, next) => {
  try {
    const { address } = req.params;
    const portfolio = await fetchPortfolio(address);
    res.json({ data: portfolio });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
