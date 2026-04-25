/**
 * botEngine.js — Core trading bot engine using technical indicators.
 *
 * Receives price ticks from Binance stream, calculates live technicals,
 * and evaluates each active bot against its multi-condition logic.
 */

const { getAllBots, updateBot } = require('./botStore');
const { getMarketIndicators } = require('./indicatorService');
const { evaluateConditions } = require('./conditionEngine');
const { getCandles } = require('./candleService');
const { BOT_STATUS, TRADE_COOLDOWN_MS } = require('../config/constants');

// Will be injected from server.js
let emitBotUpdate = () => {};
let emitBotTrade = () => {};

function setEmitters({ onUpdate, onTrade }) {
  emitBotUpdate = onUpdate;
  emitBotTrade = onTrade;
}

/**
 * Called on every price tick from the Binance stream.
 */
function onPriceTick(symbol, price) {
  const bots = getAllBots().filter(
    (b) => b.status === BOT_STATUS.ACTIVE && b.pair === symbol
  );

  if (bots.length === 0) return;

  // Compute live market technicals bridging cached candles and the live tick limit.
  const data = getMarketIndicators(symbol, price, getCandles);

  for (const bot of bots) {
    try {
      processBotTick(bot, data);
    } catch (err) {
      console.error(`[BotEngine] Error processing bot ${bot.id}:`, err.message);
    }
  }
}

function processBotTick(bot, data) {
  const price = data.price;
  const now = new Date();
  
  // --- Reset daily trade count ---
  const lastReset = new Date(bot.lastDailyReset);
  if (now.toDateString() !== lastReset.toDateString()) {
    bot = updateBot(bot.id, { dailyTradeCount: 0, lastDailyReset: now.toISOString() });
  }

  // --- Max trades per day check ---
  if (bot.exit.maxTradesPerDay > 0 && bot.dailyTradeCount >= bot.exit.maxTradesPerDay) {
    return;
  }

  // =====================
  // PATH A — No position → check entry
  // =====================
  if (!bot.position) {
    // We maintain a reference price inside the bot payload for % drop checks
    if (bot.referencePrice === null) {
      updateBot(bot.id, { referencePrice: price });
      return;
    }
    
    // Inject the reference price into the evaluation data payload
    data.referencePrice = bot.referencePrice;

    // Cooldown guard
    if (bot.lastTradeAt) {
      const elapsed = Date.now() - new Date(bot.lastTradeAt).getTime();
      if (elapsed < TRADE_COOLDOWN_MS) return;
    }

    // Evaluate Engine Rules
    const shouldEnter = evaluateConditions(bot.entryConditions, bot.logic, data);

    if (shouldEnter) {
      const notional = bot.amount * (bot.leverage || 1);
      const qty = notional / price;
      const position = {
        entryPrice: price,
        openedAt: now.toISOString(),
        qty,
      };
      const updated = updateBot(bot.id, {
        position,
        dailyTradeCount: bot.dailyTradeCount + 1,
        tradeCount: bot.tradeCount + 1,
        lastTradeAt: now.toISOString(),
        referencePrice: price, // reset ref after entry
        unrealizedPnl: 0,
      });

      emitBotUpdate(updated);
      emitBotTrade({
        botId: bot.id,
        botName: bot.name,
        type: 'open',
        pair: bot.pair,
        price,
        qty,
        amount: bot.amount,
        at: position.openedAt,
      });
    }

    return;
  }

  // =====================
  // PATH B — Position open → check exit
  // =====================
  const { entryPrice, openedAt, qty } = bot.position;
  if (!bot.position.maxPriceSeen || price > bot.position.maxPriceSeen) {
    bot.position.maxPriceSeen = price;
  }

  const unrealizedPnl = (price - entryPrice) * qty;
  const changePct = ((price - entryPrice) / entryPrice) * 100;
  const maxChangePct = ((bot.position.maxPriceSeen - entryPrice) / entryPrice) * 100;
  
  let closeReason = null;

  if (bot.exit.trailingEnabled) {
    // Check if peak price hit the trailing activation barrier
    if (maxChangePct >= bot.exit.tp) {
      // If it drops from the peak by the deviation threshold, we lock in the profit
      if (maxChangePct - changePct >= bot.exit.trailingDeviation) {
        closeReason = 'trailing_take_profit';
      }
    }
    // Standard stop loss still applies
    if (!closeReason && changePct <= -bot.exit.sl) {
      closeReason = 'stop_loss';
    }
  } else {
    // Standard static logic
    if (changePct >= bot.exit.tp) {
      closeReason = 'take_profit';
    } else if (changePct <= -bot.exit.sl) {
      closeReason = 'stop_loss';
    }
  }

  if (closeReason) {
    const realizedPnl = (price - entryPrice) * qty;
    const isWin = realizedPnl > 0;

    const trade = {
      entryPrice,
      exitPrice: price,
      pnl: realizedPnl,
      pnlPct: changePct,
      qty,
      openedAt,
      closedAt: now.toISOString(),
      closeReason,
    };

    const updatedTrades = [trade, ...bot.trades].slice(0, 100);

    const updated = updateBot(bot.id, {
      position: null,
      unrealizedPnl: 0,
      pnl: bot.pnl + realizedPnl,
      virtualBalance: bot.virtualBalance + realizedPnl,
      winCount: isWin ? bot.winCount + 1 : bot.winCount,
      trades: updatedTrades,
      referencePrice: price, // reset reference after closing
      lastTradeAt: now.toISOString(),
    });

    emitBotUpdate(updated);
    emitBotTrade({
      botId: bot.id,
      botName: bot.name,
      type: 'close',
      pair: bot.pair,
      price,
      pnl: realizedPnl,
      pnlPct: changePct,
      closeReason,
      at: trade.closedAt,
    });
  } else {
    // Constantly emit soft updates for Dashboard Syncing
    emitBotUpdate(updateBot(bot.id, { unrealizedPnl }));
  }
}

function forceClosePosition(bot, currentPrice) {
  if (!bot || !bot.position) return bot;
  
  const { entryPrice, openedAt, qty } = bot.position;
  const realizedPnl = (currentPrice - entryPrice) * qty;
  const changePct = ((currentPrice - entryPrice) / entryPrice) * 100;
  const now = new Date();
  
  const trade = {
    entryPrice,
    exitPrice: currentPrice,
    pnl: realizedPnl,
    pnlPct: changePct,
    qty,
    openedAt,
    closedAt: now.toISOString(),
    closeReason: 'manual_stop',
  };

  const updatedTrades = [trade, ...bot.trades].slice(0, 100);

  const updated = updateBot(bot.id, {
    position: null,
    unrealizedPnl: 0,
    pnl: bot.pnl + realizedPnl,
    virtualBalance: bot.virtualBalance + realizedPnl,
    winCount: realizedPnl > 0 ? bot.winCount + 1 : bot.winCount,
    trades: updatedTrades,
    referencePrice: currentPrice,
    lastTradeAt: now.toISOString(),
  });

  emitBotUpdate(updated);
  emitBotTrade({
    botId: bot.id,
    botName: bot.name,
    type: 'close',
    pair: bot.pair,
    price: currentPrice,
    pnl: realizedPnl,
    pnlPct: changePct,
    closeReason: 'manual_stop',
    at: trade.closedAt,
  });

  return updated;
}

module.exports = { onPriceTick, setEmitters, forceClosePosition };
