/**
 * botStore.js — In-memory store for all bots.
 * Each bot is a pure data object; the engine keeps it updated.
 */

const { v4: uuidv4 } = require('uuid');
const { BOT_STATUS, DEFAULT_VIRTUAL_BALANCE } = require('../config/constants');

// Map<botId, BotObject>
const bots = new Map();

// Global wallet state
let wallet = {
  balance: 50000
};

function getWallet() {
  return wallet;
}

/**
 * Create and persist a new bot.
 * @param {object} params
 * @returns {object} newly created bot
 */
function createBot({ userId = 'anonymous', name, pair, amount, leverage = 1, botClass = 'advanced', entryConditions, logic, exit }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const bot = {
    id,
    userId,
    botClass,
    name: name.trim(),
    pair: pair.toUpperCase(),
    amount: Number(amount),
    leverage: Number(leverage) || 1,
    entryConditions: Array.isArray(entryConditions) ? entryConditions : [],
    logic: logic === 'OR' ? 'OR' : 'AND',
    exit: {
      tp: Number(exit.tp),                            // take profit %
      sl: Number(exit.sl),                            // stop loss %
      trailingEnabled: !!exit.trailingEnabled,        // use trailing TP
      trailingDeviation: Number(exit.trailingDeviation) || 0.5,
      maxTradesPerDay: Number(exit.maxTradesPerDay) || 0,
    },
    status: BOT_STATUS.INACTIVE,
    position: null,           // { entryPrice, openedAt, qty }
    trades: [],               // closed trade history
    pnl: 0,                   // cumulative realized P&L
    unrealizedPnl: 0,         // live open P&L
    tradeCount: 0,
    winCount: 0,
    virtualBalance: Number(amount),
    lastTradeAt: null,        // for cooldown
    dailyTradeCount: 0,
    lastDailyReset: now,
    referencePrice: null,     // price at the moment bot was started / last closed
    createdAt: now,
    updatedAt: now,
  };
  
  // Deduct from global wallet
  wallet.balance -= bot.amount;

  bots.set(id, bot);
  return bot;
}

function getBot(id) {
  return bots.get(id) || null;
}

function getAllBots() {
  return Array.from(bots.values());
}

function updateBot(id, patch) {
  const bot = bots.get(id);
  if (!bot) return null;
  const updated = { ...bot, ...patch, updatedAt: new Date().toISOString() };
  bots.set(id, updated);
  return updated;
}

function deleteBot(id) {
  const bot = bots.get(id);
  if (bot) {
    // Refund the bot's remaining virtual balance (amount + PnL) back to the global wallet
    wallet.balance += (bot.amount + bot.pnl);
  }
  return bots.delete(id);
}

function startBot(id) {
  const bot = bots.get(id);
  if (!bot) return null;
  // Reset reference price on restart so %‐based conditions are measured fresh
  return updateBot(id, { status: BOT_STATUS.ACTIVE, referencePrice: null });
}

function stopBot(id) {
  return updateBot(id, { status: BOT_STATUS.INACTIVE });
}

module.exports = {
  createBot,
  getBot,
  getAllBots,
  updateBot,
  deleteBot,
  startBot,
  stopBot,
  getWallet,
};
