// Supported trading pairs
const SUPPORTED_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
  'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT',
];

// Entry condition types
const ENTRY_TYPE = {
  DROP: 'drop',   // buy when price drops by X%
  RISE: 'rise',   // buy when price rises by X%
};

// Bot statuses
const BOT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

// Socket.IO events
const BOT_EVENTS = {
  LIST: 'bot:list',
  UPDATE: 'bot:update',
  TRADE: 'bot:trade',
  ERROR: 'bot:error',
};

// Starting virtual balance per bot (USD)
const DEFAULT_VIRTUAL_BALANCE = 10_000;

// Minimum trade cooldown (ms) to prevent rapid re-entry
const TRADE_COOLDOWN_MS = 60_000;

module.exports = {
  SUPPORTED_PAIRS,
  ENTRY_TYPE,
  BOT_STATUS,
  BOT_EVENTS,
  DEFAULT_VIRTUAL_BALANCE,
  TRADE_COOLDOWN_MS,
};
