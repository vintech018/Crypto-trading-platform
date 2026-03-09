const WebSocket = require("ws");
const {
  normalizeTradeMessage,
  updatePriceCache,
  maybeCreateWhaleAlert,
} = require("../services/marketService");
const { broadcastPrice, broadcastAlert, broadcast } = require("./broadcaster");
const { MARKET_EVENT } = require("../config/constants");

let streamSocket;
let reconnectTimer;

function connectBinanceStream() {
  const streamUrl =
    process.env.BINANCE_WS_URL ||
    "wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade";

  const whaleThreshold = Number(process.env.WHALE_TRADE_USD_THRESHOLD || 1_000_000);

  streamSocket = new WebSocket(streamUrl);

  streamSocket.on("open", () => {
    broadcast(MARKET_EVENT, {
      event: "binance_connected",
      timestamp: new Date().toISOString(),
    });
  });

  streamSocket.on("message", (payload) => {
    try {
      const parsed = JSON.parse(payload.toString());
      const trade = normalizeTradeMessage(parsed?.data);
      if (!trade?.symbol || Number.isNaN(trade.price)) return;

      updatePriceCache(trade);

      broadcastPrice({
        symbol: trade.symbol,
        price: trade.price,
        quantity: trade.quantity,
        quoteValue: trade.quoteValue,
        tradeTime: trade.tradeTime,
      });

      const whaleAlert = maybeCreateWhaleAlert(trade, whaleThreshold);
      if (whaleAlert) {
        broadcastAlert({
          channel: "whale",
          ...whaleAlert,
        });
      }
    } catch (_err) {
      broadcast(MARKET_EVENT, {
        event: "parse_error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  streamSocket.on("close", () => {
    broadcast(MARKET_EVENT, {
      event: "binance_disconnected",
      timestamp: new Date().toISOString(),
    });
    scheduleReconnect();
  });

  streamSocket.on("error", () => {
    broadcast(MARKET_EVENT, {
      event: "binance_error",
      timestamp: new Date().toISOString(),
    });
    streamSocket?.close();
  });
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connectBinanceStream();
  }, 5000);
}

function stopBinanceStream() {
  clearTimeout(reconnectTimer);
  if (streamSocket) {
    streamSocket.close();
  }
}

module.exports = {
  connectBinanceStream,
  stopBinanceStream,
};
