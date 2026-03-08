const axios = require("axios");
const { DEFAULT_SYMBOLS, MAX_ALERT_CACHE } = require("../config/constants");

const binanceRestClient = axios.create({
  baseURL: process.env.BINANCE_REST_URL || "https://api.binance.com",
  timeout: 10_000,
});

const latestPrices = new Map();
const whaleAlerts = [];

function normalizeTradeMessage(data) {
  const symbol = data?.s;
  const price = Number(data?.p || 0);
  const quantity = Number(data?.q || 0);
  const tradeTime = data?.T || Date.now();
  const quoteValue = price * quantity;

  return {
    symbol,
    price,
    quantity,
    quoteValue,
    tradeTime,
    tradeId: data?.t,
  };
}

function updatePriceCache(trade) {
  latestPrices.set(trade.symbol, {
    symbol: trade.symbol,
    price: trade.price,
    quantity: trade.quantity,
    quoteValue: trade.quoteValue,
    tradeTime: trade.tradeTime,
    updatedAt: Date.now(),
  });
}

function getLatestPrices() {
  const values = Array.from(latestPrices.values());

  if (values.length === 0) {
    return DEFAULT_SYMBOLS.map((symbol) => ({
      symbol,
      price: null,
      quantity: null,
      quoteValue: null,
      tradeTime: null,
      updatedAt: null,
    }));
  }

  return values;
}

function maybeCreateWhaleAlert(trade, thresholdUsd) {
  if (!trade.quoteValue || trade.quoteValue < thresholdUsd) {
    return null;
  }

  const alert = {
    id: `${trade.symbol}-${trade.tradeId}-${trade.tradeTime}`,
    message: `Whale trade detected: $${trade.quoteValue.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} ${trade.symbol} trade`,
    symbol: trade.symbol,
    valueUsd: trade.quoteValue,
    price: trade.price,
    quantity: trade.quantity,
    tradeTime: trade.tradeTime,
    createdAt: new Date().toISOString(),
  };

  whaleAlerts.unshift(alert);
  if (whaleAlerts.length > MAX_ALERT_CACHE) {
    whaleAlerts.pop();
  }

  return alert;
}

function getWhaleAlerts() {
  return whaleAlerts;
}

async function fetchCandles({ symbol, interval, limit }) {
  const { data } = await binanceRestClient.get("/api/v3/klines", {
    params: { symbol, interval, limit },
  });

  return data.map((candle) => ({
    openTime: candle[0],
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4]),
    volume: Number(candle[5]),
    closeTime: candle[6],
  }));
}

async function fetch24hTicker(symbol) {
  const { data } = await binanceRestClient.get("/api/v3/ticker/24hr", {
    params: { symbol },
  });

  return {
    symbol: data.symbol,
    priceChangePercent: Number(data.priceChangePercent),
    volume: Number(data.volume),
    quoteVolume: Number(data.quoteVolume),
    lastPrice: Number(data.lastPrice),
    highPrice: Number(data.highPrice),
    lowPrice: Number(data.lowPrice),
  };
}

module.exports = {
  normalizeTradeMessage,
  updatePriceCache,
  getLatestPrices,
  maybeCreateWhaleAlert,
  getWhaleAlerts,
  fetchCandles,
  fetch24hTicker,
};
