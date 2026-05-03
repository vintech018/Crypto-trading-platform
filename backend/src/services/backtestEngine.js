// backend/src/services/backtestEngine.js
import { SignalHistory } from '../models/SignalHistory.model.js';
import { OHLC } from '../models/OHLC.model.js';

/**
 * Runs a backtest for a specific asset over a given timeframe (in days).
 */
export const runBacktest = async (asset, days = 30) => {
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Pull historical signals
  const signals = await SignalHistory.find({ 
    asset, 
    timestamp: { $gte: startTime } 
  }).sort({ timestamp: 1 });
  
  if (signals.length === 0) {
    return {
      asset,
      totalTrades: 0,
      winRate: 0,
      profitLoss: 0,
      maxDrawdown: 0,
      sharpeRatio: 0
    };
  }
  
  // Pull OHLC data to simulate entries and exits
  // Assuming 1h candles
  const candles = await OHLC.find({ 
    coin: asset, 
    interval: "1h", 
    openTime: { $gte: startTime.getTime() } 
  }).sort({ openTime: 1 });
  
  let totalTrades = 0;
  let winningTrades = 0;
  let currentPosition = null; // 'LONG' or 'SHORT'
  let entryPrice = 0;
  let capital = 10000; // start with $10,000
  const initialCapital = capital;
  let peakCapital = capital;
  let maxDrawdown = 0;
  let returns = [];
  
  let signalIndex = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentTime = new Date(candle.openTime);
    
    // Check if there are signals at this time
    while (signalIndex < signals.length && new Date(signals[signalIndex].timestamp) <= currentTime) {
      const sig = signals[signalIndex];
      
      if (sig.signal.includes('BUY') && currentPosition !== 'LONG') {
        // Apply execution delay, slippage, and fee
        const slippage = (Math.random() * (0.002 - 0.0005) + 0.0005); // 0.05% - 0.2%
        const executionPrice = candle.open * (1 + slippage);
        const fee = 0.001; // 0.1%

        // Close short if open
        if (currentPosition === 'SHORT') {
          // Closing a short means buying back, so we pay higher price (slippage) + fee
          const pnl = ((entryPrice - executionPrice) / entryPrice) - fee;
          capital = capital * (1 + pnl);
          returns.push(pnl);
          totalTrades++;
          if (pnl > 0) winningTrades++;
        }
        // Open long
        currentPosition = 'LONG';
        entryPrice = executionPrice;
        capital = capital * (1 - fee); // Pay fee to open
        
      } else if (sig.signal.includes('SELL') && currentPosition !== 'SHORT') {
        // Apply execution delay, slippage, and fee
        const slippage = (Math.random() * (0.002 - 0.0005) + 0.0005); // 0.05% - 0.2%
        const executionPrice = candle.open * (1 - slippage);
        const fee = 0.001; // 0.1%

        // Close long if open
        if (currentPosition === 'LONG') {
          // Closing a long means selling, so we get lower price (slippage) - fee
          const pnl = ((executionPrice - entryPrice) / entryPrice) - fee;
          capital = capital * (1 + pnl);
          returns.push(pnl);
          totalTrades++;
          if (pnl > 0) winningTrades++;
        }
        // Open short
        currentPosition = 'SHORT';
        entryPrice = executionPrice;
        capital = capital * (1 - fee); // Pay fee to open
      }
      
      signalIndex++;
    }
    
    // Update max drawdown
    let currentCapital = capital;
    if (currentPosition === 'LONG') {
      currentCapital = capital * (1 + (candle.close - entryPrice) / entryPrice);
    } else if (currentPosition === 'SHORT') {
      currentCapital = capital * (1 + (entryPrice - candle.close) / entryPrice);
    }
    
    if (currentCapital > peakCapital) peakCapital = currentCapital;
    const drawdown = (peakCapital - currentCapital) / peakCapital;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Close any open position at the end
  if (currentPosition === 'LONG' && candles.length > 0) {
    const lastPrice = candles[candles.length - 1].close * (1 - 0.001); // minimal slippage for end of test
    const pnl = ((lastPrice - entryPrice) / entryPrice) - 0.001; // fee
    capital = capital * (1 + pnl);
    returns.push(pnl);
    totalTrades++;
    if (pnl > 0) winningTrades++;
  } else if (currentPosition === 'SHORT' && candles.length > 0) {
    const lastPrice = candles[candles.length - 1].close * (1 + 0.001);
    const pnl = ((entryPrice - lastPrice) / entryPrice) - 0.001; // fee
    capital = capital * (1 + pnl);
    returns.push(pnl);
    totalTrades++;
    if (pnl > 0) winningTrades++;
  }
  
  const profitLoss = ((capital - initialCapital) / initialCapital) * 100;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  // Simple Sharpe Ratio (assuming risk free rate = 0)
  const avgReturn = returns.length > 0 ? returns.reduce((a,b)=>a+b,0)/returns.length : 0;
  const variance = returns.length > 0 ? returns.reduce((a,b)=>a+Math.pow(b-avgReturn,2),0)/returns.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // annualized approximation
  
  return {
    asset,
    totalTrades,
    winRate: Math.round(winRate * 100) / 100,
    profitLoss: Math.round(profitLoss * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100 * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100
  };
};
