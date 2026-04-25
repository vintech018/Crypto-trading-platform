function evaluateSingle(cond, data) {
  switch (cond.type) {
    case 'price_drop':
      if (!data.referencePrice) return false;
      return data.price <= data.referencePrice * (1 - cond.value / 100);

    case 'price_rise':
      if (!data.referencePrice) return false;
      return data.price >= data.referencePrice * (1 + cond.value / 100);

    case 'rsi':
      if (data.rsi === null) return false;
      return cond.operator === '<'
        ? data.rsi < cond.value
        : data.rsi > cond.value;

    case 'ma_cross':
      if (data.ma50 === null || data.ma200 === null) return false;
      // Meaning MA50 line crosses strictly above the MA200 line (Bullish Cross)
      return data.ma50 > data.ma200;

    case 'macd':
      // Meaning MACD > Signal (Bullish crossover)
      if (data.macd === null || data.signal === null) return false;
      return data.macd > data.signal;

    case 'bb_lower':
      // Test if current price breaches or holds around lower band
      if (data.bb_lower === null) return false;
      return cond.operator === '<' ? data.price < data.bb_lower : data.price > data.bb_lower;

    case 'bb_upper':
      // Test if current price breaches or holds around upper band
      if (data.bb_upper === null) return false;
      return cond.operator === '>' ? data.price > data.bb_upper : data.price < data.bb_upper;

    default:
      return false;
  }
}

/**
 * Checks if the bot's conditions array resolves under the chosen logic.
 * @param {Array} conditions Array of condition objects
 * @param {String} logic "AND" or "OR"
 * @param {Object} data Map of { price, rsi, ma50, ma200, macd, signal, referencePrice }
 */
function evaluateConditions(conditions, logic, data) {
  if (!conditions || conditions.length === 0) return false;
  const results = conditions.map((c) => evaluateSingle(c, data));

  return logic === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

module.exports = {
  evaluateSingle,
  evaluateConditions,
};
