const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const DEFAULT_INTERVALS = ["1m", "5m", "1h", "1d"];

module.exports = {
  DEFAULT_SYMBOLS,
  DEFAULT_INTERVALS,
  PRICE_EVENT: "price_update",
  ALERT_EVENT: "alerts",
  MARKET_EVENT: "market_event",
  MAX_ALERT_CACHE: 100,
};
