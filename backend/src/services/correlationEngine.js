// backend/src/services/correlationEngine.js
import { OHLC } from '../models/OHLC.model.js';
import { aggregateSignals } from './aggregateSignalEngine.js';

/**
 * Compare signals vs actual price movement
 * @returns {Array} Array of correlation scores per asset
 */
export const calculateCorrelations = async () => {
  const aggregatedSignals = await aggregateSignals();
  
  const correlations = [];
  
  for (const sig of aggregatedSignals) {
    const { asset, signal, strength } = sig;
    
    // Fetch the last 24 1h candles for the asset
    const candles = await OHLC.find({ coin: asset, interval: "1h" })
      .sort({ openTime: -1 })
      .limit(24);
      
    if (candles.length < 2) {
      correlations.push({
        asset,
        signal,
        priceChange: 0,
        correlationScore: 0,
        signalAccuracy: "Unknown (No price data)"
      });
      continue;
    }
    
    // Sort oldest to newest
    candles.sort((a, b) => a.openTime - b.openTime);
    
    const oldestPrice = candles[0].open;
    const newestPrice = candles[candles.length - 1].close;
    
    const priceChangePct = ((newestPrice - oldestPrice) / oldestPrice) * 100;
    
    // Calculate correlation
    // If signal is BUY and price is UP -> accurate
    // If signal is SELL and price is DOWN -> accurate
    let correlationScore = 0;
    let signalAccuracy = "Weak";
    
    if ((signal.includes('BUY') && priceChangePct > 0) || (signal.includes('SELL') && priceChangePct < 0)) {
      // Correct direction
      correlationScore = strength * Math.min(Math.abs(priceChangePct) / 2, 1); // up to strength
      signalAccuracy = correlationScore > 3 ? "Highly Accurate" : "Accurate";
    } else if (signal === 'HOLD') {
      correlationScore = 0;
      signalAccuracy = "Neutral";
    } else {
      // Incorrect direction
      correlationScore = -strength * Math.min(Math.abs(priceChangePct) / 2, 1);
      signalAccuracy = "Inaccurate";
    }
    
    correlations.push({
      asset,
      signal,
      priceChange: Math.round(priceChangePct * 100) / 100,
      correlationScore: Math.round(correlationScore * 100) / 100,
      signalAccuracy
    });
  }
  
  return correlations;
};
