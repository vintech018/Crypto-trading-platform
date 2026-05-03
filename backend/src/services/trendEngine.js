// backend/src/services/trendEngine.js
import News from '../models/News.model.js';

/**
 * Analyze last 24h news from DB
 * Count asset mentions and rank assets by frequency
 */
export const getTrendingAssets = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Aggregate pipeline to count asset frequencies
  const pipeline = [
    {
      $match: {
        publishedAt: { $gte: oneDayAgo }
      }
    },
    {
      $unwind: "$affectedAssets"
    },
    {
      $group: {
        _id: "$affectedAssets",
        mentions: { $sum: 1 }
      }
    },
    {
      $sort: { mentions: -1 }
    },
    {
      $project: {
        _id: 0,
        asset: "$_id",
        mentions: 1
      }
    }
  ];

  const trending = await News.aggregate(pipeline);
  return trending;
};
