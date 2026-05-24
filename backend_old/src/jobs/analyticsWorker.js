import { prisma } from "../postgres/client.js";
import { Worker } from "bullmq";
import { redisClient } from "../config/redis.js";
import { replicateTradeAnalytics, writeAuditLog } from "../analytics/services/tradeAnalytics.service.js";
import logger from "../utils/logger.js";

let worker = null;



/**
 * Perform all replication operations for a TRADE_REPLICATION event
 */
export async function processTradeReplication(event) {
  if (!prisma) {
    logger.debug("[analyticsWorker] PostgreSQL client not configured. Skipping trade replication.");
    return;
  }
  const { userId, tradeId, asset, tradeType, amount, pnl, price, quantity } = event.payload;
  
  const createdAt = event.createdAt ? new Date(event.createdAt) : new Date();
  const todayStr = createdAt.toISOString().split('T')[0];
  const today = new Date(todayStr);
  const month = createdAt.toISOString().slice(0, 7);

  const isWin = pnl > 0 ? 1 : 0;
  const isLoss = pnl < 0 ? 1 : 0;
  const buyVolume = tradeType === "BUY" ? amount : 0;
  const sellVolume = tradeType === "SELL" ? amount : 0;

  // 1. TradeAnalytics
  await replicateTradeAnalytics({ userId, tradeId, asset, tradeType, amount, pnl });

  // 2. DailyPnL
  const existingDaily = await prisma.dailyPnL.findUnique({
    where: { userId_date: { userId: String(userId), date: today } }
  });

  if (existingDaily) {
    await prisma.dailyPnL.update({
      where: { id: existingDaily.id },
      data: {
        realisedPnL: { increment: pnl },
        tradeCount: { increment: 1 },
        buyVolume: { increment: buyVolume },
        sellVolume: { increment: sellVolume },
        winCount: { increment: isWin },
        lossCount: { increment: isLoss }
      }
    });
  } else {
    await prisma.dailyPnL.create({
      data: {
        userId: String(userId),
        date: today,
        realisedPnL: pnl,
        tradeCount: 1,
        buyVolume,
        sellVolume,
        winCount: isWin,
        lossCount: isLoss
      }
    });
  }

  // 3. AssetPerformance
  const existingAsset = await prisma.assetPerformance.findUnique({
    where: { userId_asset: { userId: String(userId), asset } }
  });

  if (existingAsset) {
    const newTotalBought = existingAsset.totalBought + buyVolume;
    const newBuyCount = existingAsset.buyCount + (tradeType === "BUY" ? 1 : 0);
    const avgBuyPrice = newBuyCount > 0 && tradeType === "BUY" 
      ? ((existingAsset.avgBuyPrice * existingAsset.buyCount) + (price * quantity)) / newBuyCount 
      : existingAsset.avgBuyPrice;

    const newTotalSold = existingAsset.totalSold + sellVolume;
    const newSellCount = existingAsset.sellCount + (tradeType === "SELL" ? 1 : 0);
    const avgSellPrice = newSellCount > 0 && tradeType === "SELL"
      ? ((existingAsset.avgSellPrice * existingAsset.sellCount) + (price * quantity)) / newSellCount
      : existingAsset.avgSellPrice;

    await prisma.assetPerformance.update({
      where: { id: existingAsset.id },
      data: {
        totalBought: newTotalBought,
        totalSold: newTotalSold,
        buyCount: newBuyCount,
        sellCount: newSellCount,
        realisedPnL: { increment: pnl },
        avgBuyPrice,
        avgSellPrice,
        lastTradeAt: new Date()
      }
    });
  } else {
    await prisma.assetPerformance.create({
      data: {
        userId: String(userId),
        asset,
        totalBought: buyVolume,
        totalSold: sellVolume,
        buyCount: tradeType === "BUY" ? 1 : 0,
        sellCount: tradeType === "SELL" ? 1 : 0,
        realisedPnL: pnl,
        avgBuyPrice: tradeType === "BUY" ? price : 0,
        avgSellPrice: tradeType === "SELL" ? price : 0,
        lastTradeAt: new Date()
      }
    });
  }

  // 4. MonthlyPerformance
  const existingMonthly = await prisma.monthlyPerformance.findUnique({
    where: { userId_month: { userId: String(userId), month } }
  });

  if (existingMonthly) {
    await prisma.monthlyPerformance.update({
      where: { id: existingMonthly.id },
      data: {
        realisedPnL: { increment: pnl },
        tradeCount: { increment: 1 },
        buyVolume: { increment: buyVolume },
        sellVolume: { increment: sellVolume },
        winCount: { increment: isWin },
        lossCount: { increment: isLoss }
      }
    });
  } else {
    await prisma.monthlyPerformance.create({
      data: {
        userId: String(userId),
        month,
        realisedPnL: pnl,
        tradeCount: 1,
        buyVolume,
        sellVolume,
        winCount: isWin,
        lossCount: isLoss
      }
    });
  }

  // 5. TradingStreak
  if (tradeType === "SELL") {
    const existingStreak = await prisma.tradingStreak.findUnique({
      where: { userId: String(userId) }
    });

    if (existingStreak) {
      let currentStreak = existingStreak.currentStreak;
      let currentStreakType = existingStreak.currentStreakType;
      let bestWinStreak = existingStreak.bestWinStreak;
      let worstLossStreak = existingStreak.worstLossStreak;

      if (isWin) {
        if (currentStreakType === "WIN") {
          currentStreak += 1;
        } else {
          currentStreak = 1;
          currentStreakType = "WIN";
        }
        if (currentStreak > bestWinStreak) bestWinStreak = currentStreak;
      } else if (isLoss) {
        if (currentStreakType === "LOSS") {
          currentStreak += 1;
        } else {
          currentStreak = 1;
          currentStreakType = "LOSS";
        }
        if (currentStreak > worstLossStreak) worstLossStreak = currentStreak;
      } else {
        currentStreak = 0;
        currentStreakType = "NONE";
      }

      await prisma.tradingStreak.update({
        where: { id: existingStreak.id },
        data: {
          currentStreak,
          currentStreakType,
          bestWinStreak,
          worstLossStreak,
          totalWins: { increment: isWin },
          totalLosses: { increment: isLoss },
          totalTrades: { increment: 1 }
        }
      });
    } else {
      await prisma.tradingStreak.create({
        data: {
          userId: String(userId),
          currentStreak: isWin ? 1 : isLoss ? 1 : 0,
          currentStreakType: isWin ? "WIN" : isLoss ? "LOSS" : "NONE",
          bestWinStreak: isWin ? 1 : 0,
          worstLossStreak: isLoss ? 1 : 0,
          totalWins: isWin,
          totalLosses: isLoss,
          totalTrades: 1
        }
      });
    }
  }
}

/**
 * Perform replication for an AUDIT_LOG event
 */
export async function processAuditLog(event) {
  if (!prisma) {
    logger.debug("[analyticsWorker] PostgreSQL client not configured. Skipping audit log replication.");
    return;
  }
  const { action, metadata } = event.payload;
  await writeAuditLog(event.userId, action, metadata);
}

/**
 * Process a single event with structured logging
 */
async function processJob(job) {
  const startTime = Date.now();
  try {
    logger.info(JSON.stringify({
      type: "analytics_job_processing",
      jobId: job.id,
      jobName: job.name,
      userId: job.data.userId,
      attemptsMade: job.attemptsMade,
      timestamp: new Date().toISOString()
    }));

    if (job.name === "TRADE_REPLICATION") {
      await processTradeReplication(job.data);
    } else if (job.name === "AUDIT_LOG") {
      await processAuditLog(job.data);
    } else {
      throw new Error(`Unknown job name: ${job.name}`);
    }

    const durationMs = Date.now() - startTime;
    logger.info(JSON.stringify({
      type: "analytics_job_success",
      jobId: job.id,
      userId: job.data.userId,
      durationMs,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error(JSON.stringify({
      type: "analytics_job_failed",
      jobId: job.id,
      userId: job.data.userId,
      error: err.message,
      durationMs,
      timestamp: new Date().toISOString()
    }));
    throw err; // Let BullMQ handle retries and DLQ
  }
}

/**
 * Starts the BullMQ background worker
 */
export function startAnalyticsWorker() {
  if (worker) return;
  if (!process.env.REDIS_URL) {
    logger.warn("[analyticsWorker] REDIS_URL not configured. Analytics worker disabled.");
    return;
  }
  logger.info("[analyticsWorker] Starting analytics BullMQ worker...");
  
  worker = new Worker("analytics-queue", async (job) => {
    await processJob(job);
  }, { 
    connection: redisClient,
    concurrency: 5 // Process 5 jobs concurrently
  });

  worker.on("failed", (job, err) => {
    logger.error(`[analyticsWorker] Job ${job.id} failed: ${err.message}`);
  });
}

/**
 * Gracefully shuts down the BullMQ worker
 */
export async function stopAnalyticsWorker() {
  logger.info("[analyticsWorker] Shutting down analytics BullMQ worker...");
  if (worker) {
    await worker.close();
    worker = null;
  }
  logger.info("[analyticsWorker] Analytics worker shutdown complete.");
}
