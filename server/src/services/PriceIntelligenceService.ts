/**
 * PriceIntelligenceService
 * 
 * Transforms raw Binance ticker data into normalized price updates.
 * Computes USD and INR prices, direction signals, and volatility.
 * 
 * Architecture Decision:
 * - Backend computes ALL price calculations
 * - Frontend NEVER calculates prices
 * - This ensures consistency and reduces frontend complexity
 */

import { EventEmitter } from 'events';
import type { BinanceTickerMessage, PriceUpdate } from '../types/market.types.js';
import { DEFAULT_CONFIG, pairToSymbol } from '../types/market.types.js';

export class PriceIntelligenceService extends EventEmitter {
    private prices: Map<string, PriceUpdate> = new Map();
    private previousPrices: Map<string, number> = new Map();
    private usdtInrRate: number = DEFAULT_CONFIG.usdtInrRate;
    private volatilityWindow: Map<string, number[]> = new Map();
    private readonly VOLATILITY_WINDOW_SIZE = 20;

    constructor() {
        super();
    }

    /**
     * Process a raw Binance ticker message.
     * Returns the normalized PriceUpdate.
     */
    processTicker(ticker: BinanceTickerMessage): PriceUpdate {
        const pair = ticker.s;
        const symbol = pairToSymbol(pair);

        const priceUsd = parseFloat(ticker.c);
        const previousPrice = this.previousPrices.get(symbol) || priceUsd;

        // Calculate direction
        let direction: 'up' | 'down' | 'neutral' = 'neutral';
        if (priceUsd > previousPrice) direction = 'up';
        else if (priceUsd < previousPrice) direction = 'down';

        // Calculate volatility
        const volatility = this._calculateVolatility(symbol, priceUsd);

        // Build price update
        const priceUpdate: PriceUpdate = {
            symbol,
            pair,
            price_usd: priceUsd,
            price_inr: priceUsd * this.usdtInrRate,
            change_24h: parseFloat(ticker.P),
            change_amount: parseFloat(ticker.p),
            direction,
            volatility,
            high_24h: parseFloat(ticker.h),
            low_24h: parseFloat(ticker.l),
            volume_24h: parseFloat(ticker.v),
            quote_volume_24h: parseFloat(ticker.q),
            timestamp: Date.now(),
            source: 'binance',
        };

        // Store for next comparison
        this.previousPrices.set(symbol, priceUsd);
        this.prices.set(symbol, priceUpdate);

        // Emit the update
        this.emit('price_update', priceUpdate);

        return priceUpdate;
    }

    /**
     * Calculate volatility based on recent price movements.
     */
    private _calculateVolatility(symbol: string, currentPrice: number): 'high' | 'medium' | 'low' {
        let window = this.volatilityWindow.get(symbol);

        if (!window) {
            window = [];
            this.volatilityWindow.set(symbol, window);
        }

        window.push(currentPrice);

        // Keep only last N prices
        if (window.length > this.VOLATILITY_WINDOW_SIZE) {
            window.shift();
        }

        // Need at least 5 data points to calculate
        if (window.length < 5) {
            return 'low';
        }

        // Calculate standard deviation as % of mean
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const variance = window.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / window.length;
        const stdDev = Math.sqrt(variance);
        const coeffOfVariation = (stdDev / mean) * 100;

        // Classify volatility
        if (coeffOfVariation > 0.5) return 'high';
        if (coeffOfVariation > 0.2) return 'medium';
        return 'low';
    }

    /**
     * Update the USDT/INR exchange rate.
     */
    setUsdtInrRate(rate: number): void {
        this.usdtInrRate = rate;
        console.log(`[PriceIntelligence] INR rate updated to: ₹${rate}`);

        // Recalculate all INR prices
        for (const [symbol, price] of this.prices) {
            price.price_inr = price.price_usd * rate;
        }
    }

    /**
     * Get current USDT/INR rate.
     */
    getUsdtInrRate(): number {
        return this.usdtInrRate;
    }

    /**
     * Get price for a specific symbol.
     */
    getPrice(symbol: string): PriceUpdate | undefined {
        return this.prices.get(symbol.toUpperCase());
    }

    /**
     * Get all current prices.
     */
    getAllPrices(): PriceUpdate[] {
        return Array.from(this.prices.values());
    }

    /**
     * Get prices sorted by 24h change (gainers/losers).
     */
    getTopGainers(limit = 10): PriceUpdate[] {
        return Array.from(this.prices.values())
            .sort((a, b) => b.change_24h - a.change_24h)
            .slice(0, limit);
    }

    getTopLosers(limit = 10): PriceUpdate[] {
        return Array.from(this.prices.values())
            .sort((a, b) => a.change_24h - b.change_24h)
            .slice(0, limit);
    }

    /**
     * Get service stats.
     */
    getStats() {
        return {
            trackedSymbols: this.prices.size,
            usdtInrRate: this.usdtInrRate,
        };
    }
}

// Singleton instance
export const priceIntelligenceService = new PriceIntelligenceService();
