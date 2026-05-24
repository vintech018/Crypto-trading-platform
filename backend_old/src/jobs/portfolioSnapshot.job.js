import cron from "node-cron";
import { prisma } from "../postgres/client.js";
import User from "../models/User.model.js";
import { getPortfolio } from "../services/portfolio.service.js";
import logger from "../utils/logger.js";

/**
 * Takes a portfolio snapshot for a specific user and saves it to PostgreSQL
 */
export async function takePortfolioSnapshot(userId) {
  try {
    const portfolio = await getPortfolio(userId);
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const existing = await prisma.portfolioSnapshot.findUnique({
      where: { userId_date: { userId: userId.toString(), date: today } }
    });

    if (existing) {
      await prisma.portfolioSnapshot.update({
        where: { id: existing.id },
        data: {
          totalValue: portfolio.totalPortfolioValue,
          walletBalance: portfolio.walletBalance,
          holdingsValue: portfolio.totalHoldingsValue,
          unrealisedPnL: portfolio.totalUnrealisedPnL
        }
      });
    } else {
      await prisma.portfolioSnapshot.create({
        data: {
          userId: userId.toString(),
          date: today,
          totalValue: portfolio.totalPortfolioValue,
          walletBalance: portfolio.walletBalance,
          holdingsValue: portfolio.totalHoldingsValue,
          unrealisedPnL: portfolio.totalUnrealisedPnL,
          realisedPnLCumulative: 0 // This would be updated by trade events if needed
        }
      });
    }
  } catch (err) {
    logger.warn(`[portfolioSnapshot] Failed to take snapshot for user ${userId}: ${err.message}`);
  }
}

/**
 * Starts the daily cron job to snapshot all users' portfolios
 */
export function startPortfolioSnapshotJob() {
  // Run at midnight UTC daily
  cron.schedule("0 0 * * *", async () => {
    logger.info("[portfolioSnapshot] Starting daily portfolio snapshot job...");
    try {
      const users = await User.find({}, "_id").lean();
      
      let successCount = 0;
      for (const user of users) {
        await takePortfolioSnapshot(user._id);
        successCount++;
      }
      
      logger.info(`[portfolioSnapshot] Successfully created snapshots for ${successCount} users.`);
    } catch (err) {
      logger.error(`[portfolioSnapshot] Daily job failed: ${err.message}`);
    }
  });
}
