/**
 * decimal.js — High-precision financial arithmetic helpers
 *
 * JavaScript's IEEE-754 double precision causes errors like:
 *   0.1 + 0.2 === 0.30000000000000004
 *
 * We avoid this by working in scaled integers (10^8 = satoshi precision):
 *   - All values are scaled by SCALE = 10^8
 *   - Arithmetic uses BigInt (no float errors)
 *   - Results are plain JS Numbers only at the API boundary
 *
 * Usage:
 *   D(0.1).plus(D(0.2)).toNumber()       // 0.3 ✓
 *   D(qty).times(D(price)).toFixed(8)    // "650.00000000"
 *   weightedAvg(existQty, existAvg, newQty, newPrice)
 */

const SCALE = 100_000_000n; // 10^8 — satoshi level precision

// ─── Core factory ─────────────────────────────────────────────────────────

/** Wraps a JS number or string into a scaled BigInt representation */
function D(value) {
  const num = Number(value) || 0;

  // Handle sign
  const isNeg  = num < 0;
  const absNum = Math.abs(num);

  // Convert to 8-decimal fixed string (handles scientific notation like 5e-9)
  let fixedStr;
  if (absNum < 1e-8) {
    // Below minimum precision — treat as zero
    fixedStr = "0.00000000";
  } else {
    fixedStr = absNum.toFixed(8);
  }

  const dotIdx = fixedStr.indexOf(".");
  const intPart = dotIdx >= 0 ? fixedStr.slice(0, dotIdx) : fixedStr;
  const decPart = dotIdx >= 0 ? fixedStr.slice(dotIdx + 1).padEnd(8, "0").slice(0, 8) : "00000000";

  const scaled = BigInt(intPart) * SCALE + BigInt(decPart);

  return makeDecimal(isNeg ? -scaled : scaled);
}

function makeDecimal(scaledBigInt) {
  return {
    _v: scaledBigInt,

    plus(other)  { return makeDecimal(this._v + other._v); },
    minus(other) { return makeDecimal(this._v - other._v); },
    times(other) { return makeDecimal((this._v * other._v) / SCALE); },
    div(other) {
      if (other._v === 0n) throw new Error("Division by zero");
      return makeDecimal((this._v * SCALE) / other._v);
    },
    abs()  { return makeDecimal(this._v < 0n ? -this._v : this._v); },
    neg()  { return makeDecimal(-this._v); },

    isNeg()  { return this._v < 0n; },
    isZero() { return this._v === 0n; },
    gt(other)  { return this._v > other._v; },
    gte(other) { return this._v >= other._v; },
    lt(other)  { return this._v < other._v; },
    lte(other) { return this._v <= other._v; },
    eq(other)  { return this._v === other._v; },

    /** Returns a plain JS Number */
    toNumber() {
      const abs  = this._v < 0n ? -this._v : this._v;
      const int  = abs / SCALE;
      const frac = abs % SCALE;
      const result = Number(int) + Number(frac) / Number(SCALE);
      return this._v < 0n ? -result : result;
    },

    /** Returns a string with exactly `places` decimal places (default 8) */
    toFixed(places = 8) {
      return this.toNumber().toFixed(places);
    },
  };
}

// ─── Public helpers ────────────────────────────────────────────────────────

/**
 * Weighted-average buy price.
 * newAvg = (existQty * existAvg + newQty * newPrice) / (existQty + newQty)
 * @returns JS Number
 */
export function weightedAvg(existQty, existAvg, newQty, newPrice) {
  const totalQty = D(existQty).plus(D(newQty));
  if (totalQty.isZero()) return 0;
  const numerator = D(existQty).times(D(existAvg)).plus(D(newQty).times(D(newPrice)));
  return numerator.div(totalQty).toNumber();
}

/**
 * Realised P/L for a single SELL.
 * (sellPrice - avgBuyPrice) × quantity
 * @returns JS Number
 */
export function realisedPnL(sellPrice, avgBuyPrice, quantity) {
  return D(sellPrice).minus(D(avgBuyPrice)).times(D(quantity)).toNumber();
}

/**
 * Unrealised P/L for an open holding.
 * (currentPrice - avgBuyPrice) × quantity
 * @returns JS Number
 */
export function unrealisedPnL(currentPrice, avgBuyPrice, quantity) {
  return D(currentPrice).minus(D(avgBuyPrice)).times(D(quantity)).toNumber();
}

/**
 * Round a JS number to `places` decimal places with no float drift.
 * @returns JS Number
 */
export function round(value, places = 8) {
  return parseFloat(D(value).toFixed(places));
}

export { D };
