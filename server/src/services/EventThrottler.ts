/**
 * EventThrottler
 * 
 * Aggregates high-frequency Binance events into batched updates.
 * Prevents UI overwhelm by coalescing ticks within a time window.
 * 
 * Why throttle?
 * - Binance sends 100+ events/second for popular pairs
 * - UI only needs 3-10 updates/second for smooth animation
 * - Reduces WebSocket traffic to clients
 * - Frame-safe updates (no flicker)
 */

import { EventEmitter } from 'events';
import type { PriceUpdate } from '../types/market.types.js';
import { DEFAULT_CONFIG } from '../types/market.types.js';

export class EventThrottler extends EventEmitter {
    private pendingUpdates: Map<string, PriceUpdate> = new Map();
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private throttleWindowMs: number;
    private isRunning = false;

    // Stats
    private eventsReceived = 0;
    private batchesSent = 0;
    private eventsSent = 0;

    constructor(throttleWindowMs = DEFAULT_CONFIG.throttleWindowMs) {
        super();
        this.throttleWindowMs = throttleWindowMs;
    }

    /**
     * Start the throttler. Batched updates will be emitted at regular intervals.
     */
    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.flushInterval = setInterval(() => {
            this._flush();
        }, this.throttleWindowMs);

        console.log(`[Throttler] Started with ${this.throttleWindowMs}ms window`);
    }

    /**
     * Stop the throttler.
     */
    stop(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.isRunning = false;
        console.log('[Throttler] Stopped');
    }

    /**
     * Add a price update to the pending batch.
     * Only the latest update per symbol is kept.
     */
    addUpdate(update: PriceUpdate): void {
        this.eventsReceived++;

        // Coalesce: keep only the latest update per symbol
        this.pendingUpdates.set(update.symbol, update);
    }

    /**
     * Flush pending updates and emit as a batch.
     */
    private _flush(): void {
        if (this.pendingUpdates.size === 0) return;

        const updates = Array.from(this.pendingUpdates.values());
        this.pendingUpdates.clear();

        this.batchesSent++;
        this.eventsSent += updates.length;

        // Emit batch update
        this.emit('batch', updates);

        // Also emit individual updates for fine-grained handling
        for (const update of updates) {
            this.emit('update', update);
        }
    }

    /**
     * Force flush all pending updates immediately.
     */
    flushNow(): void {
        this._flush();
    }

    /**
     * Set the throttle window.
     */
    setThrottleWindow(ms: number): void {
        this.throttleWindowMs = ms;

        // Restart if running
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }

    /**
     * Get throttler stats.
     */
    getStats() {
        const compressionRatio = this.eventsReceived > 0
            ? ((this.eventsReceived - this.eventsSent) / this.eventsReceived * 100).toFixed(1)
            : '0';

        return {
            isRunning: this.isRunning,
            throttleWindowMs: this.throttleWindowMs,
            pendingUpdates: this.pendingUpdates.size,
            eventsReceived: this.eventsReceived,
            batchesSent: this.batchesSent,
            eventsSent: this.eventsSent,
            compressionRatio: `${compressionRatio}%`,
        };
    }
}

// Singleton instance
export const eventThrottler = new EventThrottler();
