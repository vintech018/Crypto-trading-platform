// backend/src/services/signalEngine.js

/**
 * Generate a trading signal based on sentiment, impact, and confidence.
 * IF sentiment=bullish, impactScore>=7, confidence>=0.6 -> signal="BUY"
 * IF sentiment=bearish, impactScore>=7 -> signal="SELL"
 * ELSE -> signal="HOLD"
 * 
 * @param {Object} analysis - The output from newsAnalyzer
 * @returns {Object} { signal, strength, reasoning }
 */
export const generateSignal = (analysis) => {
  const { sentiment, impactScore, confidence } = analysis;
  
  let signal = "HOLD";
  let reasoning = "Not enough impact or clear sentiment to trigger trade.";
  let strength = Math.round((impactScore * confidence) * 10) / 10; // 0 to 10 scale
  
  if (sentiment === 'bullish' && impactScore >= 7 && confidence >= 0.6) {
    signal = "BUY";
    reasoning = `High positive impact (${impactScore}/10) with strong confidence (${Math.round(confidence*100)}%).`;
  } else if (sentiment === 'bearish' && impactScore >= 7) {
    // Note: The user spec didn't specify confidence>=0.6 for SELL, but we'll stick strictly to the spec.
    signal = "SELL";
    reasoning = `High negative impact (${impactScore}/10) indicates risk.`;
  }
  
  return {
    signal,
    strength,
    reasoning
  };
};
