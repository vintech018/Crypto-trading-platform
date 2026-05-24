import { prisma } from "../../postgres/client.js";

// ─── Empty results when PostgreSQL is not configured ────────────────────────
// prisma is null when DATABASE_URL is unset (see postgres/client.js).
// Every read function must return empty data gracefully in that case.

export async function getPortfolioHistory(userId, days = 30) {
  if (!prisma) return [];
  const records = await prisma.portfolioSnapshot.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: Number(days),
  });
  return records.reverse(); // Return in chronological order
}

export async function getDailyPnLHistory(userId, days = 30) {
  if (!prisma) return [];
  const records = await prisma.dailyPnL.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: Number(days),
  });
  return records.reverse();
}

export async function getAssetBreakdown(userId) {
  if (!prisma) return [];
  const records = await prisma.assetPerformance.findMany({
    where: { userId },
  });
  // Sort by total volume (bought + sold) descending
  return records.sort((a, b) => (b.totalBought + b.totalSold) - (a.totalBought + a.totalSold));
}

export async function getTradingStats(userId) {
  if (!prisma) return null;
  return await prisma.tradingStreak.findUnique({
    where: { userId },
  });
}

export async function getMonthlyPerformance(userId, months = 12) {
  if (!prisma) return [];
  const records = await prisma.monthlyPerformance.findMany({
    where: { userId },
    orderBy: { month: 'desc' },
    take: Number(months),
  });
  return records.reverse();
}

export async function getDashboardSummary(userId) {

  const [portfolioHistory, dailyPnL, assets, stats, monthly] = await Promise.all([
    getPortfolioHistory(userId, 30),
    getDailyPnLHistory(userId, 30),
    getAssetBreakdown(userId),
    getTradingStats(userId),
    getMonthlyPerformance(userId, 12)
  ]);

  return {
    portfolioHistory,
    dailyPnL,
    assets,
    stats,
    monthly
  };
}
