/**
 * botStore.js — Persistent store for all bots using Prisma (SQLite/PostgreSQL).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BOT_STATUS } = require('../config/constants');

// Initialize wallet if it doesn't exist
async function initWallet() {
  const w = await prisma.wallet.findUnique({ where: { id: 1 } });
  if (!w) {
    await prisma.wallet.create({ data: { id: 1, balance: 50000 } });
  }
}
initWallet();

async function getWallet() {
  const w = await prisma.wallet.findUnique({ where: { id: 1 } });
  return w || { balance: 0 };
}

/**
 * Create and persist a new bot.
 */
async function createBot({ userId = 'anonymous', name, pair, amount, leverage = 1, botClass = 'advanced', entryConditions, logic, exit }) {
  const w = await getWallet();
  if (w.balance < Number(amount)) {
    throw new Error(`Insufficient capital. Available: $${w.balance.toFixed(2)}`);
  }

  // Deduct from global wallet
  await prisma.wallet.update({
    where: { id: 1 },
    data: { balance: w.balance - Number(amount) }
  });

  const bot = await prisma.bot.create({
    data: {
      userId,
      botClass,
      name: name.trim(),
      pair: pair.toUpperCase(),
      amount: Number(amount),
      leverage: Number(leverage) || 1,
      logic: logic === 'OR' ? 'OR' : 'AND',
      virtualBalance: Number(amount),
      status: BOT_STATUS.INACTIVE,
      entryConditions: {
        create: Array.isArray(entryConditions) ? entryConditions.map(c => ({
          type: c.type,
          operator: c.operator,
          value: c.value ? Number(c.value) : null
        })) : []
      },
      exit: {
        create: {
          tp: Number(exit.tp),
          sl: Number(exit.sl),
          trailingEnabled: !!exit.trailingEnabled,
          trailingDeviation: Number(exit.trailingDeviation) || 0.5,
          maxTradesPerDay: Number(exit.maxTradesPerDay) || 0,
        }
      }
    },
    include: {
      entryConditions: true,
      exit: true,
      position: true,
      trades: { orderBy: { closedAt: 'desc' }, take: 100 }
    }
  });

  return bot;
}

async function getBot(id) {
  return await prisma.bot.findUnique({
    where: { id },
    include: { entryConditions: true, exit: true, position: true, trades: { orderBy: { closedAt: 'desc' }, take: 100 } }
  });
}

async function getAllBots() {
  return await prisma.bot.findMany({
    include: { entryConditions: true, exit: true, position: true, trades: { orderBy: { closedAt: 'desc' }, take: 100 } }
  });
}

async function updateBot(id, patch) {
  // Prisma handles simple scalar updates directly.
  // Extract relational updates (position, trades) if present.
  const { position, trades, exit, entryConditions, ...scalarPatch } = patch;

  let bot = await prisma.bot.update({
    where: { id },
    data: scalarPatch,
  });

  // Handle nested Position upsert/delete
  if (position !== undefined) {
    if (position === null) {
      await prisma.position.deleteMany({ where: { botId: id } });
    } else {
      await prisma.position.upsert({
        where: { botId: id },
        create: { ...position, botId: id },
        update: position,
      });
    }
  }

  // Handle new Trades (we assume patch.trades is the FULL array of trades as passed by botEngine previously,
  // but with Prisma we should ideally just create the latest trade. However, to match the previous API:
  // botEngine pushes [trade, ...bot.trades] to updateBot. We will just check if there's a new trade.)
  // Actually, we can just clear and recreate trades or insert the new one if we change botEngine.
  // To avoid refactoring botEngine too much, let's just insert the trade if patch.trades contains more elements?
  // Wait, Prisma is persistent. It's better to just write the new trade. We will refactor botEngine instead of parsing the array.
  
  // We'll return the fully populated bot.
  return await getBot(id);
}

// Custom wrapper to insert a trade
async function addTradeToBot(botId, tradeData) {
  await prisma.trade.create({
    data: { ...tradeData, botId }
  });
}

async function deleteBot(id) {
  const bot = await getBot(id);
  if (bot) {
    // Refund the bot's remaining virtual balance (amount + PnL) back to the global wallet
    const w = await getWallet();
    await prisma.wallet.update({
      where: { id: 1 },
      data: { balance: w.balance + (bot.amount + bot.pnl) }
    });
    await prisma.bot.delete({ where: { id } });
    return true;
  }
  return false;
}

async function startBot(id) {
  const bot = await getBot(id);
  if (!bot) return null;
  // Reset reference price on restart so %-based conditions are measured fresh
  return await updateBot(id, { status: BOT_STATUS.ACTIVE, referencePrice: null });
}

async function stopBot(id) {
  return await updateBot(id, { status: BOT_STATUS.INACTIVE });
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
  addTradeToBot,
};
