// backend/src/services/performanceEngine.js
import { SignalHistory } from '../models/SignalHistory.model.js';
import { SignalPerformance } from '../models/SignalPerformance.model.js';

export const trackPerformance = async () => {
  const assets = ['BTC', 'ETH', 'SOL'];
  
  for (const asset of assets) {
    const allSignals = await SignalHistory.find({ asset, outcome: { $in: ['PROFIT', 'LOSS'] } });
    if (allSignals.length === 0) continue;

    const allTimeProfit = allSignals.filter(s => s.outcome === 'PROFIT').length;
    const allTimeAccuracy = allTimeProfit / allSignals.length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSignals = allSignals.filter(s => new Date(s.timestamp) >= sevenDaysAgo);
    
    let rolling7DayAccuracy = 0;
    if (recentSignals.length > 0) {
      const recentProfit = recentSignals.filter(s => s.outcome === 'PROFIT').length;
      rolling7DayAccuracy = recentProfit / recentSignals.length;
    }

    let reliabilityBadge = 'LOW';
    if (allTimeAccuracy > 0.6 && allSignals.length > 50) reliabilityBadge = 'HIGH';
    else if (allTimeAccuracy > 0.5 && allSignals.length > 20) reliabilityBadge = 'MEDIUM';

    await SignalPerformance.findOneAndUpdate(
      { asset },
      {
        allTimeAccuracy: Math.round(allTimeAccuracy * 100) / 100,
        rolling7DayAccuracy: Math.round(rolling7DayAccuracy * 100) / 100,
        totalSignals: allSignals.length,
        reliabilityBadge,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
  }
};
