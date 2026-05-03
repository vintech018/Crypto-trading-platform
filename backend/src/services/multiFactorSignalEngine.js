// backend/src/services/multiFactorSignalEngine.js
import { OHLC } from '../models/OHLC.model.js';
import { WhaleEvent } from '../models/WhaleEvents.model.js';
import { SocialSentiment } from '../models/SocialSentiment.model.js';
import News from '../models/News.model.js';

import { MLWeights } from '../models/MLWeights.model.js';
import { SignalHistory } from '../models/SignalHistory.model.js';

export const calculateMultiFactorSignal = async (asset) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Fetch learned weights
  const wModel = await MLWeights.findOne({ asset });
  const weights = wModel ? wModel.weights : {
    news: 0.30,
    momentum: 0.25,
    volume: 0.15,
    whale: 0.15,
    social: 0.15
  };
  
  // 1. News Score (-1 to 1)
  const newsItems = await News.find({ affectedAssets: asset, publishedAt: { $gte: oneDayAgo } });
  let newsScore = 0;
  if (newsItems.length > 0) {
    let sum = 0;
    newsItems.forEach(n => {
      let val = n.sentiment === 'bullish' ? 1 : n.sentiment === 'bearish' ? -1 : 0;
      sum += val * (n.impactScore / 10);
    });
    newsScore = sum / newsItems.length;
  }

  // 2. Price Momentum (-1 to 1) & 3. Volume Spike (0 to 1)
  let priceMomentum = 0;
  let volumeSpike = 0;
  const candles = await OHLC.find({ coin: asset, interval: "1h", openTime: { $gte: oneDayAgo.getTime() } }).sort({ openTime: 1 });
  
  if (candles.length > 0) {
    const startPrice = candles[0].open;
    const endPrice = candles[candles.length - 1].close;
    const priceChangePct = (endPrice - startPrice) / startPrice;
    
    // Normalize momentum (e.g., +/- 5% maxes out score to +/- 1)
    priceMomentum = Math.max(-1, Math.min(1, priceChangePct / 0.05));
    
    // Volume: check if latest volume is significantly higher than average
    const avgVolume = candles.reduce((acc, c) => acc + c.volume, 0) / candles.length;
    const lastVolume = candles[candles.length - 1].volume;
    if (avgVolume > 0) {
      const volumeRatio = lastVolume / avgVolume;
      volumeSpike = Math.min(1, Math.max(0, (volumeRatio - 1) / 2)); // if ratio is 3x -> 1
    }
  }

  // 4. Whale Activity (-1 to 1)
  let whaleImpact = 0;
  const whales = await WhaleEvent.find({ asset, timestamp: { $gte: oneDayAgo } });
  if (whales.length > 0) {
    let netFlow = 0;
    whales.forEach(w => {
      netFlow += w.direction === 'OUTFLOW' ? w.amountUSD : -w.amountUSD;
    });
    // Normalize whale impact (e.g., 10M net flow maxes out score)
    whaleImpact = Math.max(-1, Math.min(1, netFlow / 10000000));
  }

  // 5. Social Sentiment (-1 to 1)
  let socialScore = 0;
  const tweets = await SocialSentiment.find({ asset, timestamp: { $gte: oneDayAgo } });
  if (tweets.length > 0) {
    let sum = 0;
    tweets.forEach(t => {
      let val = t.sentiment === 'bullish' ? 1 : t.sentiment === 'bearish' ? -1 : 0;
      sum += val;
    });
    socialScore = sum / tweets.length;
  }

  const finalScore = 
    (weights.news * newsScore) +
    (weights.momentum * priceMomentum) +
    (weights.volume * volumeSpike) + 
    (weights.whale * whaleImpact) +
    (weights.social * socialScore);

  const adjustedMomentum = priceMomentum * (1 + volumeSpike);
  
  const actualScore = 
    (weights.news * newsScore) +
    (weights.momentum * Math.max(-1, Math.min(1, adjustedMomentum))) +
    (weights.whale * whaleImpact) +
    (weights.social * socialScore);

  let finalSignal = 'HOLD';
  if (actualScore > 0.3) finalSignal = 'STRONG BUY';
  else if (actualScore > 0.1) finalSignal = 'BUY';
  else if (actualScore < -0.3) finalSignal = 'STRONG SELL';
  else if (actualScore < -0.1) finalSignal = 'SELL';

  const factors = {
    news: Math.round(newsScore * 100) / 100,
    momentum: Math.round(priceMomentum * 100) / 100,
    volume: Math.round(volumeSpike * 100) / 100,
    whale: Math.round(whaleImpact * 100) / 100,
    social: Math.round(socialScore * 100) / 100
  };

  // Save to history so it can be learned from
  if (finalSignal !== 'HOLD') {
    const candles = await OHLC.find({ coin: asset }).sort({ openTime: -1 }).limit(1);
    const currentPrice = candles.length > 0 ? candles[0].close : 0;
    
    await SignalHistory.create({
      asset,
      signal: finalSignal,
      score: Math.round(actualScore * 100) / 100,
      priceAtSignal: currentPrice,
      factors,
      timestamp: new Date()
    });
  }

  return {
    asset,
    finalSignal,
    score: Math.round(actualScore * 100) / 100,
    contributingFactors: factors
  };
};

export const getMultiFactorSignals = async () => {
  const assets = ['BTC', 'ETH', 'SOL'];
  const results = [];
  for (const asset of assets) {
    const res = await calculateMultiFactorSignal(asset);
    results.push(res);
  }
  return results;
};
