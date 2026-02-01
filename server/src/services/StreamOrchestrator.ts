/**
 * StreamOrchestrator
 * 
 * Dynamically manages Binance stream subscriptions based on client demand.
 * Implements reference counting to avoid redundant subscriptions.
 * 
 * Key Features:
 * - Auto-subscribes to top coins on startup
 * - Dynamically adds streams when clients request new symbols
 * - Auto-unsubscribes unused streams after idle timeout
 * - Prevents WebSocket overload
 */

import { EventEmitter } from 'events';
import type { StreamSubscription } from '../types/market.types.js';
import { TOP_PAIRS, symbolToPair } from '../types/market.types.js';
import { binanceStreamManager } from './BinanceStreamManager.js';
import { coinMetadataService } from './CoinMetadataService.js';

export class StreamOrchestrator extends EventEmitter {
    private subscriptions: Map<string, StreamSubscription> = new Map();
    private idleTimeout = 60000; // 60 seconds
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        super();
    }

    /**
     * Initialize with top coins.
     */
    initialize(): void {
        // Register initial top pairs
        for (const pair of TOP_PAIRS) {
            const symbol = pair.replace('usdt', '').toUpperCase();
            this.subscriptions.set(symbol, {
                symbol,
                pair,
                clientCount: 1, // System subscription
                lastAccessed: Date.now(),
                isActive: true,
            });

            // Mark as live in metadata service
            coinMetadataService.setLiveSymbol(symbol, true);
        }

        // Start cleanup job
        this._startCleanup();

        console.log(`[Orchestrator] Initialized with ${TOP_PAIRS.length} top pairs`);
    }

    /**
     * Request subscription to symbols.
     * Called when a client subscribes.
     */
    requestSubscription(symbols: string[]): void {
        const newPairs: string[] = [];

        for (const symbol of symbols) {
            const upperSymbol = symbol.toUpperCase();
            const pair = symbolToPair(upperSymbol);

            const existing = this.subscriptions.get(upperSymbol);

            if (existing) {
                // Increment reference count
                existing.clientCount++;
                existing.lastAccessed = Date.now();
            } else {
                // New subscription needed
                this.subscriptions.set(upperSymbol, {
                    symbol: upperSymbol,
                    pair,
                    clientCount: 1,
                    lastAccessed: Date.now(),
                    isActive: false,
                });
                newPairs.push(pair);
            }
        }

        // Subscribe to new pairs via Binance
        if (newPairs.length > 0) {
            binanceStreamManager.subscribe(newPairs);

            // Mark as active and live
            for (const pair of newPairs) {
                const symbol = pair.replace('usdt', '').toUpperCase();
                const sub = this.subscriptions.get(symbol);
                if (sub) {
                    sub.isActive = true;
                    coinMetadataService.setLiveSymbol(symbol, true);
                }
            }

            console.log(`[Orchestrator] Added ${newPairs.length} new streams`);
        }
    }

    /**
     * Release subscription to symbols.
     * Called when a client unsubscribes or disconnects.
     */
    releaseSubscription(symbols: string[]): void {
        for (const symbol of symbols) {
            const upperSymbol = symbol.toUpperCase();
            const sub = this.subscriptions.get(upperSymbol);

            if (sub) {
                sub.clientCount = Math.max(0, sub.clientCount - 1);

                // Don't immediately unsubscribe - let cleanup handle it
                if (sub.clientCount === 0) {
                    sub.lastAccessed = Date.now();
                }
            }
        }
    }

    /**
     * Start cleanup job to unsubscribe idle streams.
     */
    private _startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this._cleanupIdleStreams();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Unsubscribe from streams that have been idle too long.
     */
    private _cleanupIdleStreams(): void {
        const now = Date.now();
        const pairsToUnsubscribe: string[] = [];
        const symbolsToRemove: string[] = [];

        for (const [symbol, sub] of this.subscriptions) {
            // Skip if still has subscribers
            if (sub.clientCount > 0) continue;

            // Skip if recently accessed
            if (now - sub.lastAccessed < this.idleTimeout) continue;

            // Skip top pairs (always keep them)
            if (TOP_PAIRS.includes(sub.pair)) continue;

            pairsToUnsubscribe.push(sub.pair);
            symbolsToRemove.push(symbol);
        }

        if (pairsToUnsubscribe.length > 0) {
            // Unsubscribe from Binance
            binanceStreamManager.unsubscribe(pairsToUnsubscribe);

            // Remove from our tracking
            for (const symbol of symbolsToRemove) {
                this.subscriptions.delete(symbol);
                coinMetadataService.setLiveSymbol(symbol, false);
            }

            console.log(`[Orchestrator] Cleaned up ${pairsToUnsubscribe.length} idle streams`);
        }
    }

    /**
     * Check if a symbol is actively streaming.
     */
    isStreaming(symbol: string): boolean {
        const sub = this.subscriptions.get(symbol.toUpperCase());
        return sub?.isActive ?? false;
    }

    /**
     * Get all active subscriptions.
     */
    getActiveSubscriptions(): StreamSubscription[] {
        return Array.from(this.subscriptions.values()).filter(s => s.isActive);
    }

    /**
     * Get stats.
     */
    getStats() {
        let totalClients = 0;
        let activeStreams = 0;

        for (const sub of this.subscriptions.values()) {
            totalClients += sub.clientCount;
            if (sub.isActive) activeStreams++;
        }

        return {
            totalSubscriptions: this.subscriptions.size,
            activeStreams,
            totalClientSubscriptions: totalClients,
        };
    }

    /**
     * Shutdown.
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.subscriptions.clear();
        console.log('[Orchestrator] Shutdown complete');
    }
}

// Singleton instance
export const streamOrchestrator = new StreamOrchestrator();
