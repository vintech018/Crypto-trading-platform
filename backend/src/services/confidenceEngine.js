// backend/src/services/confidenceEngine.js
import { SignalHistory } from '../models/SignalHistory.model.js';
import { OHLC } from '../models/OHLC.model.js';

export const updateSignalOutcomes = async () => {
  // Find pending signals
  const pendingSignals = await SignalHistory.find({ outcome: 'PENDING' });
  
  for (const signal of pendingSignals) {
    // Check if 4 hours have passed since the signal
    const timePassed = Date.now() - new Date(signal.timestamp).getTime();
    if (timePassed < 4 * 60 * 60 * 1000) continue;
    
    // Fetch candles after signal
    const candles = await OHLC.find({ 
      coin: signal.asset, 
      interval: "1h", 
      openTime: { $gte: new Date(signal.timestamp).getTime() } 
    }).sort({ openTime: 1 }).limit(4);
    
    if (candles.length > 0) {
      const startPrice = signal.priceAtSignal || candles[0].open;
      const endPrice = candles[candles.length - 1].close;
      const priceChangePct = ((endPrice - startPrice) / startPrice) * 100;
      
      let outcome = 'LOSS';
      if ((signal.signal.includes('BUY') && priceChangePct > 0) || (signal.signal.includes('SELL') && priceChangePct < 0)) {
        outcome = 'PROFIT';
      }
      
      signal.outcome = outcome;
      signal.pnlPercentage = Math.round(priceChangePct * 100) / 100;
      await signal.save();
    }
  }
};

export const getHistoricalConfidence = async () => {
  const assets = ['BTC', 'ETH', 'SOL'];
  const results = [];
  
  for (const asset of assets) {
    const signals = await SignalHistory.find({ asset, outcome: { $in: ['PROFIT', 'LOSS'] } });
    if (signals.length === 0) {
      results.push({ asset, confidence: 0, pastAccuracy: "0%", sampleSize: 0, reliability: "LOW" });
      continue;
    }
    
    const profitCount = signals.filter(s => s.outcome === 'PROFIT').length;
    const baseAccuracy = profitCount / signals.length;
    
    // Weight by sample size (diminishing returns, maxes out at 100 samples)
    const sampleWeight = Math.min(1, signals.length / 100);
    
    // Strong signals are generally more reliable than weak signals
    const strongSignals = signals.filter(s => s.signal.includes('STRONG')).length;
    const signalStrengthFactor = strongSignals / signals.length;

    // Confidence formula
    const confidence = (baseAccuracy * 0.7) + (sampleWeight * 0.2) + (signalStrengthFactor * 0.1);
    
    let reliability = 'LOW';
    if (confidence > 0.7 && signals.length > 50) reliability = 'HIGH';
    else if (confidence > 0.5 && signals.length > 20) reliability = 'MEDIUM';

    results.push({
      asset,
      confidence: Math.round(confidence * 100) / 100,
      pastAccuracy: `${Math.round(baseAccuracy * 100)}%`,
      sampleSize: signals.length,
      reliability
    });
  }
  
  return results;
};
