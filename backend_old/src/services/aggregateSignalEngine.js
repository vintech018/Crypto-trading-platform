// backend/src/services/aggregateSignalEngine.js
import News from '../models/News.model.js';

/**
 * Aggregates signals from recent news articles per asset
 * @returns {Array} Array of aggregated signals
 */
export const aggregateSignals = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pipeline = [
    {
      $match: {
        publishedAt: { $gte: oneDayAgo },
        affectedAssets: { $exists: true, $not: { $size: 0 } }
      }
    },
    {
      $unwind: "$affectedAssets"
    },
    {
      $group: {
        _id: "$affectedAssets",
        articleCount: { $sum: 1 },
        bullishCount: {
          $sum: { $cond: [{ $eq: ["$sentiment", "bullish"] }, 1, 0] }
        },
        bearishCount: {
          $sum: { $cond: [{ $eq: ["$sentiment", "bearish"] }, 1, 0] }
        },
        avgImpact: { $avg: "$impactScore" },
        avgConfidence: { $avg: "$confidence" }
      }
    }
  ];

  const results = await News.aggregate(pipeline);
  
  return results.map(data => {
    const asset = data._id;
    let signal = "HOLD";
    let strength = 0;
    
    // Aggregated logic
    const netBullish = data.bullishCount - data.bearishCount;
    const aggregatedScore = (netBullish * data.avgImpact * data.avgConfidence) / Math.max(1, data.articleCount);
    
    // Determine signal based on aggregated data
    // If predominantly bullish and strong avg impact
    if (netBullish > 0 && data.avgImpact >= 6 && data.avgConfidence >= 0.5) {
      signal = netBullish >= 3 ? "STRONG BUY" : "BUY";
      strength = Math.round(data.avgImpact * data.avgConfidence * 10) / 10;
    } else if (netBullish < 0 && data.avgImpact >= 6) {
      signal = netBullish <= -3 ? "STRONG SELL" : "SELL";
      strength = Math.round(data.avgImpact * data.avgConfidence * 10) / 10;
    }
    
    return {
      asset,
      signal,
      strength,
      aggregatedScore: Math.round(aggregatedScore * 100) / 100,
      articleCount: data.articleCount,
      metrics: {
        bullish: data.bullishCount,
        bearish: data.bearishCount,
        avgImpact: Math.round(data.avgImpact * 10) / 10,
        avgConfidence: Math.round(data.avgConfidence * 100) / 100
      }
    };
  });
};
