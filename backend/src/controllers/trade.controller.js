import Trade from "../models/Trade.model.js";
import { executeBuy, executeSell, depositFunds } from "../services/trade.service.js";
import { getPortfolio } from "../services/portfolio.service.js";
import { sendSuccess } from "../utils/helpers.js";
import { createAlert } from "./alert.controller.js";
import { emitTradeUpdate } from "../websocket.js";
import { D, round } from "../utils/decimal.js";


/**
 * POST /api/trade/buy
 * Body: { coin, quantity, price }
 */
export async function buy(req, res, next) {
  try {
    const { coin, quantity, price } = req.body;
    const { trade, wallet } = await executeBuy(req.user.id, coin, quantity, price);

    await createAlert(req.user.id, `Buy executed: ${quantity} ${coin} @ $${price}`, "SUCCESS");

    const portfolio = await getPortfolio(req.user.id);
    emitTradeUpdate(req.user.id, { portfolio, latestTrade: trade, pnl: 0 });

    return sendSuccess(res, 200, `BUY order for ${quantity} ${coin} executed.`, {
      trade: {
        id:          trade._id,
        coin:        trade.coin,
        type:        trade.type,
        quantity:    trade.quantity,
        price:       trade.price,
        totalValue:  trade.totalValue,
        avgBuyPrice: trade.avgBuyPrice,
        createdAt:   trade.createdAt,
      },
      walletBalance: wallet.balance,
    });
  } catch (err) {
    await createAlert(req.user.id, `Buy failed: ${err.message}`, "ERROR");
    next(err);
  }
}

/**
 * POST /api/trade/sell
 * Body: { coin, quantity, price }
 */
export async function sell(req, res, next) {
  try {
    const { coin, quantity, price } = req.body;
    const { trade, wallet, realisedPnL } = await executeSell(req.user.id, coin, quantity, price);

    await createAlert(req.user.id, `Sell executed: ${quantity} ${coin} @ $${price}`, "SUCCESS");

    const portfolio = await getPortfolio(req.user.id);
    emitTradeUpdate(req.user.id, { portfolio, latestTrade: trade, pnl: realisedPnL });

    return sendSuccess(res, 200, `SELL order for ${quantity} ${coin} executed.`, {
      trade: {
        id:          trade._id,
        coin:        trade.coin,
        type:        trade.type,
        quantity:    trade.quantity,
        price:       trade.price,
        totalValue:  trade.totalValue,
        avgBuyPrice: trade.avgBuyPrice,
        realisedPnL: trade.realisedPnL,
        createdAt:   trade.createdAt,
      },
      realisedPnL,
      walletBalance: wallet.balance,
    });
  } catch (err) {
    await createAlert(req.user.id, `Sell failed: ${err.message}`, "ERROR");
    next(err);
  }
}

/**
 * POST /api/trade/deposit
 * Body: { amount }
 */
export async function deposit(req, res, next) {
  try {
    const { amount } = req.body;
    const { wallet, ledgerEntry } = await depositFunds(req.user.id, amount);

    return sendSuccess(res, 200, `Deposited $${amount} successfully.`, {
      balance:  wallet.balance,
      ledgerId: ledgerEntry._id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trade/history
 * Query: coin, startDate, endDate, page, limit
 */
export async function tradeHistory(req, res, next) {
  try {
    const { coin, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = { userId: req.user.id };
    if (coin) filter.coin = coin.toUpperCase();
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Trade.countDocuments(filter);
    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const rows = trades.map(t => ({
      id:          t._id,
      coin:        t.coin,
      type:        t.type,
      quantity:    t.quantity,
      price:       t.price,
      totalValue:  t.totalValue,
      avgBuyPrice: t.avgBuyPrice ?? null,
      realisedPnL: t.realisedPnL ?? null,
      createdAt:   t.createdAt,
    }));

    return sendSuccess(res, 200, "Trade history fetched.", {
      trades: rows,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trade/summary
 * Returns: totalTrades, netPnL, winRate, bestTrade, worstTrade, buyCount, sellCount
 */
export async function tradeSummary(req, res, next) {
  try {
    const { coin, startDate, endDate } = req.query;

    const filter = { userId: req.user.id };
    if (coin) filter.coin = coin.toUpperCase();
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const trades = await Trade.find(filter).lean();
    const sells  = trades.filter(t => t.type === "SELL" && t.realisedPnL != null);

    let netPnL   = D(0);
    let bestPnL  = null;
    let worstPnL = null;
    let wins     = 0;

    for (const t of sells) {
      const pnl = D(t.realisedPnL);
      netPnL = netPnL.plus(pnl);
      if (pnl.gt(D(0))) wins++;
      if (bestPnL  === null || pnl.gt(D(bestPnL.realisedPnL)))  bestPnL  = t;
      if (worstPnL === null || pnl.lt(D(worstPnL.realisedPnL))) worstPnL = t;
    }

    const winRate = sells.length > 0 ? round((wins / sells.length) * 100, 1) : 0;

    return sendSuccess(res, 200, "Trade summary fetched.", {
      totalTrades: trades.length,
      buyCount:    trades.filter(t => t.type === "BUY").length,
      sellCount:   sells.length,
      netPnL:      round(netPnL.toNumber(), 2),
      winRate,
      bestTrade:  bestPnL  ? { coin: bestPnL.coin,  pnl: round(bestPnL.realisedPnL, 2),  price: bestPnL.price,  createdAt: bestPnL.createdAt }  : null,
      worstTrade: worstPnL ? { coin: worstPnL.coin, pnl: round(worstPnL.realisedPnL, 2), price: worstPnL.price, createdAt: worstPnL.createdAt } : null,
    });
  } catch (err) {
    next(err);
  }
}
