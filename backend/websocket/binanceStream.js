/**
 * binanceStream.js — Connects to Binance public WebSocket stream.
 * Feeds parsed price ticks to the bot engine.
 */

const WebSocket = require('ws');
const { onPriceTick } = require('../services/botEngine');

const STREAM_URL =
  process.env.BINANCE_WS_URL ||
  'wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade/bnbusdt@trade/xrpusdt@trade/dogeusdt@trade/avaxusdt@trade/linkusdt@trade';

let ws;
let reconnectTimer;
let isDestroyed = false;

function connect() {
  if (isDestroyed) return;
  ws = new WebSocket(STREAM_URL);

  ws.on('open', () => {
    console.log('[Binance] WebSocket connected');
  });

  ws.on('message', (raw) => {
    try {
      const parsed = JSON.parse(raw.toString());
      const data = parsed?.data;
      if (!data) return;

      const symbol = data.s;        // e.g. 'BTCUSDT'
      const price = parseFloat(data.p); // trade price

      if (!symbol || isNaN(price)) return;
      onPriceTick(symbol, price);
    } catch (_) {
      // silently ignore parse errors on individual ticks
    }
  });

  ws.on('close', () => {
    console.log('[Binance] WebSocket closed — reconnecting in 5s');
    if (!isDestroyed) {
      reconnectTimer = setTimeout(connect, 5000);
    }
  });

  ws.on('error', (err) => {
    console.error('[Binance] WebSocket error:', err.message);
    ws.close();
  });
}

function start() {
  isDestroyed = false;
  connect();
}

function stop() {
  isDestroyed = true;
  clearTimeout(reconnectTimer);
  if (ws) ws.close();
}

module.exports = { start, stop };
