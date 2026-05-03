/**
 * botEngine.js — Core trading bot engine using technical indicators.
 *
 * Receives price ticks from Binance stream, calculates live technicals,
 * and evaluates each active bot against its multi-condition logic asynchronously.
 */

const { getAllBots, updateBot, addTradeToBot } = require('./botStore');
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
async function onPriceTick(symbol, price) {
  const allBots = await getAllBots();
  const bots = allBots.filter(
    (b) => b.status === BOT_STATUS.ACTIVE && b.pair === symbol
  );

  if (bots.length === 0) return;

  // Compute live market technicals bridging cached candles and the live tick limit.
  const data = getMarketIndicators(symbol, price, getCandles);

  for (const bot of bots) {
    try {
      await processBotTick(bot, data);
    } catch (err) {
      console.error(`[BotEngine] Error processing bot ${bot.id}:`, err.message);
    }
  }
}

async function processBotTick(bot, data) {
  const price = data.price;
  const now = new Date();
  
  // --- Reset daily trade count ---
  const lastReset = new Date(bot.lastDailyReset);
  if (now.toDateString() !== lastReset.toDateString()) {
    bot = await updateBot(bot.id, { dailyTradeCount: 0, lastDailyReset: now.toISOString() });
  }

  // --- Max trades per day check ---
  if (bot.exit && bot.exit.maxTradesPerDay > 0 && bot.dailyTradeCount >= bot.exit.maxTradesPerDay) {
    return;
  }

  // =====================
  // PATH A — No position → check entry
  // =====================
  if (!bot.position) {
    // We maintain a reference price inside the bot payload for % drop checks
    if (bot.referencePrice === null) {
      await updateBot(bot.id, { referencePrice: price });
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
    let shouldEnter = false;

    if (bot.botClass === 'algo') {
      if (data.rsi !== null && data.macd !== null) {
        shouldEnter = data.rsi < 65 && data.macd > data.signal;
      } else {
        shouldEnter = Math.random() > 0.95;
      }
    } else {
      shouldEnter = evaluateConditions(bot.entryConditions || [], bot.logic, data);
    }

    if (shouldEnter) {
      const notional = bot.amount * (bot.leverage || 1);
      const qty = notional / price;
      const position = {
        entryPrice: price,
        openedAt: now.toISOString(),
        qty,
      };
      const updated = await updateBot(bot.id, {
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
    // We won't await this save immediately to save DB calls, we just keep it in memory 
    // and let the next cycle or close save it if needed, OR we can just save it.
    await updateBot(bot.id, { position: bot.position });
  }

  const unrealizedPnl = (price - entryPrice) * qty;
  const changePct = ((price - entryPrice) / entryPrice) * 100;
  const maxChangePct = ((bot.position.maxPriceSeen - entryPrice) / entryPrice) * 100;
  
  let closeReason = null;

  if (bot.exit && bot.exit.trailingEnabled) {
    if (maxChangePct >= bot.exit.tp) {
      if (maxChangePct - changePct >= bot.exit.trailingDeviation) {
        closeReason = 'trailing_take_profit';
      }
    }
    if (!closeReason && changePct <= -bot.exit.sl) {
      closeReason = 'stop_loss';
    }
  } else if (bot.exit) {
    if (changePct >= bot.exit.tp) {
      closeReason = 'take_profit';
    } else if (changePct <= -bot.exit.sl) {
      closeReason = 'stop_loss';
    }
  }

  // 🚀 Simulated ML Engine Exit (Paper Trading Fallback)
  if (!closeReason && bot.botClass === 'algo' && data.rsi !== null) {
      if (changePct > 0.05 && data.rsi > 70) {
          closeReason = 'ml_dynamic_take_profit';
      } else if (changePct < -0.1 && data.rsi < 30) {
          closeReason = 'ml_dynamic_stop_loss';
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
      openedAt: new Date(openedAt).toISOString(),
      closedAt: now.toISOString(),
      closeReason,
    };

    await addTradeToBot(bot.id, trade);

    const updated = await updateBot(bot.id, {
      position: null,
      unrealizedPnl: 0,
      pnl: bot.pnl + realizedPnl,
      virtualBalance: bot.virtualBalance + realizedPnl,
      winCount: isWin ? bot.winCount + 1 : bot.winCount,
      referencePrice: price,
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
    // Soft update
    const updated = await updateBot(bot.id, { unrealizedPnl });
    emitBotUpdate(updated);
  }
}

async function forceClosePosition(bot, currentPrice) {
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
    openedAt: new Date(openedAt).toISOString(),
    closedAt: now.toISOString(),
    closeReason: 'manual_stop',
  };

  await addTradeToBot(bot.id, trade);

  const updated = await updateBot(bot.id, {
    position: null,
    unrealizedPnl: 0,
    pnl: bot.pnl + realizedPnl,
    virtualBalance: bot.virtualBalance + realizedPnl,
    winCount: realizedPnl > 0 ? bot.winCount + 1 : bot.winCount,
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
