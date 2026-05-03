/**
 * constants.js — global application constants
 */

// Supported coins (extend as needed)
export const SUPPORTED_COINS = [
  "BTC", "ETH", "BNB", "SOL", "XRP",
  "ADA", "DOGE", "AVAX", "MATIC", "DOT",
  "LINK",
];

export const TRADE_TYPE = Object.freeze({ BUY: "BUY", SELL: "SELL" });
export const LEDGER_TYPE = Object.freeze({
  DEPOSIT:  "DEPOSIT",
  BUY:      "BUY",
  SELL:     "SELL",
  WITHDRAW: "WITHDRAW",
});

// Map our coin symbols → CoinGecko IDs
export const COINGECKO_ID_MAP = {
  BTC:   "bitcoin",
  ETH:   "ethereum",
  BNB:   "binancecoin",
  SOL:   "solana",
  XRP:   "ripple",
  ADA:   "cardano",
  DOGE:  "dogecoin",
  AVAX:  "avalanche-2",
  MATIC: "matic-network",
  DOT:   "polkadot",
  LINK:  "chainlink",
};
