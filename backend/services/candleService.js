const axios = require('axios');
const { SUPPORTED_PAIRS } = require('../config/constants');

const candleCache = new Map();

async function fetchCandles(symbol, interval = '1m', limit = 200) {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol, interval, limit }
    });
    // K-lines return nested array. Index 4 is the closing price.
    const closes = res.data.map(k => Number(k[4]));
    candleCache.set(symbol, closes);
  } catch (err) {
    console.error(`[CandleService] Failed fetching ${symbol}:`, err.message);
  }
}

async function initCandleService() {
  console.log('[CandleService] Initializing 200-period candle cache...');
  for (const pair of SUPPORTED_PAIRS) {
    await fetchCandles(pair);
  }
  // Refresh cache every 1 minute
  setInterval(async () => {
    for (const pair of SUPPORTED_PAIRS) {
      await fetchCandles(pair);
    }
  }, 60000);
}

function getCandles(symbol) {
  return candleCache.get(symbol) || [];
}

module.exports = {
  initCandleService,
  getCandles
};
