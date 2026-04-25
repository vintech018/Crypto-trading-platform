function calculateSMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateBollingerBands(closes, period = 20, stdDevMult = 2) {
  if (!closes || closes.length < period) return { bb_lower: null, bb_upper: null, sma: null };
  const sma = calculateSMA(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    sma,
    bb_lower: sma - (stdDevMult * stdDev),
    bb_upper: sma + (stdDevMult * stdDev)
  };
}

function calculateEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = calculateSMA(closes.slice(0, period), period); // SMA as seed
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * k + ema;
  }
  return ema;
}

function calculateRSI(closes, period = 14) {
  if (!closes || closes.length <= period) return null;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate raw gains/losses for smoothing
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  
  let averageGain = gains / period;
  let averageLoss = losses / period;
  
  if (averageLoss === 0) return 100;
  
  let rs = averageGain / averageLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes) {
  if (!closes || closes.length < 35) {
    return { macd: null, signal: null, histogram: null };
  }
  
  // MACD Line = 12-EMA - 26-EMA
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;
  
  // Signal Line = 9-EMA of MACD Line
  // Generating a small historical MACD array to seed the signal
  const macdHistory = [];
  for (let i = closes.length - 20; i <= closes.length; i++) {
    const subSet = closes.slice(0, i);
    const subEma12 = calculateEMA(subSet, 12);
    const subEma26 = calculateEMA(subSet, 26);
    macdHistory.push(subEma12 - subEma26);
  }
  
  const signalLine = calculateEMA(macdHistory, 9);
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine
  };
}

// Global aggregator
function getMarketIndicators(symbol, currentPrice, getCandlesFn) {
  const cachedCloses = getCandlesFn(symbol);
  
  // Create an updated tick array
  const closes = [...cachedCloses];
  if (closes.length > 0) {
    closes[closes.length - 1] = currentPrice; // Update current live tick
  } else {
    // If no cache, return empty
    return { price: currentPrice, rsi: null, ma50: null, ma200: null, macd: null, signal: null };
  }

  const rsi = calculateRSI(closes, 14);
  const ma50 = calculateSMA(closes, 50);
  const ma200 = calculateSMA(closes, 200);
  const macdData = calculateMACD(closes);
  const bbData = calculateBollingerBands(closes, 20, 2);

  return {
    price: currentPrice,
    rsi,
    ma50,
    ma200,
    macd: macdData.macd,
    signal: macdData.signal,
    bb_lower: bbData.bb_lower,
    bb_upper: bbData.bb_upper,
  };
}

module.exports = {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  getMarketIndicators
};
