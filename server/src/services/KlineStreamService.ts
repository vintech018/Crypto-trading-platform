/**
 * KlineStreamService
 * 
 * Manages Binance kline (candlestick) WebSocket streams for real-time chart updates.
 * Separate from ticker streams for clean separation of concerns.
 * 
 * Architecture:
 * - Subscribes to kline streams (e.g., btcusdt@kline_1m)
 * - Normalizes kline data for TradingView consumption
 * - Fans out updates to subscribed clients
 * 
 * Why separate from ticker?
 * - Klines have different event structure
 * - Chart updates need different throttling (none - must be real-time)
 * - Cleaner subscription management per symbol+interval
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { BinanceKlineMessage, KlineUpdate } from '../types/market.types.js';
import { DEFAULT_CONFIG } from '../types/market.types.js';

type KlineCallback = (kline: KlineUpdate) => void;

interface KlineSubscription {
    symbol: string;
    interval: string;
    streamName: string;
    clientCount: number;
}

export class KlineStreamService extends EventEmitter {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, KlineSubscription> = new Map();
    private callbacks: Map<string, Set<KlineCallback>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private isIntentionallyClosed = false;
    private messageId = 1;

    constructor() {
        super();
    }

    /**
     * Subscribe to kline stream for a symbol and interval.
     * Creates WebSocket connection if not exists.
     */
    async subscribe(symbol: string, interval: string, callback: KlineCallback): Promise<() => void> {
        const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
        const key = `${symbol.toUpperCase()}_${interval}`;

        // Add callback
        if (!this.callbacks.has(key)) {
            this.callbacks.set(key, new Set());
        }
        this.callbacks.get(key)!.add(callback);

        // Check if already subscribed
        if (this.subscriptions.has(key)) {
            const sub = this.subscriptions.get(key)!;
            sub.clientCount++;
            console.log(`[Kline] Existing subscription reused: ${streamName} (${sub.clientCount} clients)`);
            return () => this.unsubscribe(symbol, interval, callback);
        }

        // Create new subscription
        this.subscriptions.set(key, {
            symbol: symbol.toUpperCase(),
            interval,
            streamName,
            clientCount: 1,
        });

        // Connect or subscribe
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this._connect();
        } else {
            this._sendSubscribe([streamName]);
        }

        console.log(`[Kline] Subscribed: ${streamName}`);
        return () => this.unsubscribe(symbol, interval, callback);
    }

    /**
     * Unsubscribe from kline stream.
     */
    unsubscribe(symbol: string, interval: string, callback: KlineCallback): void {
        const key = `${symbol.toUpperCase()}_${interval}`;
        const streamName = `${symbol.toLowerCase()}@kline_${interval}`;

        // Remove callback
        const callbacks = this.callbacks.get(key);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.callbacks.delete(key);
            }
        }

        // Decrement client count
        const sub = this.subscriptions.get(key);
        if (sub) {
            sub.clientCount--;
            if (sub.clientCount <= 0) {
                this._sendUnsubscribe([streamName]);
                this.subscriptions.delete(key);
                console.log(`[Kline] Unsubscribed: ${streamName}`);
            }
        }
    }

    /**
     * Connect to Binance WebSocket.
     */
    private async _connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.isIntentionallyClosed = false;
        const streams = Array.from(this.subscriptions.values())
            .map(s => s.streamName)
            .join('/');

        const url = streams
            ? `${DEFAULT_CONFIG.binanceWsUrl}/${streams}`
            : DEFAULT_CONFIG.binanceWsUrl;

        console.log(`[Kline] Connecting...`);

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);

                this.ws.on('open', () => {
                    console.log('[Kline] Connected');
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    this._handleMessage(data);
                });

                this.ws.on('error', (error) => {
                    console.error('[Kline] WebSocket error:', error);
                });

                this.ws.on('close', () => {
                    console.log('[Kline] Disconnected');
                    if (!this.isIntentionallyClosed) {
                        this._scheduleReconnect();
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send SUBSCRIBE command.
     */
    private _sendSubscribe(streams: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const message = {
            method: 'SUBSCRIBE',
            params: streams,
            id: this.messageId++,
        };
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Send UNSUBSCRIBE command.
     */
    private _sendUnsubscribe(streams: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const message = {
            method: 'UNSUBSCRIBE',
            params: streams,
            id: this.messageId++,
        };
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Handle incoming kline message.
     */
    private _handleMessage(data: WebSocket.Data): void {
        try {
            const message = JSON.parse(data.toString());

            // Skip subscription confirmations
            if (message.result !== undefined) return;

            // Handle combined stream format
            let klineMsg: BinanceKlineMessage;
            if (message.stream && message.data) {
                klineMsg = message.data;
            } else if (message.e === 'kline') {
                klineMsg = message;
            } else {
                return;
            }

            // Normalize kline data
            const k = klineMsg.k;
            const update: KlineUpdate = {
                symbol: k.s,
                interval: k.i,
                time: k.t,  // Start time in ms
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v),
                isClosed: k.x,
            };

            // Notify callbacks
            const key = `${update.symbol}_${update.interval}`;
            const callbacks = this.callbacks.get(key);
            if (callbacks) {
                for (const cb of callbacks) {
                    try {
                        cb(update);
                    } catch (error) {
                        console.error('[Kline] Callback error:', error);
                    }
                }
            }

            // Emit for other listeners
            this.emit('kline', update);

        } catch (error) {
            console.error('[Kline] Parse error:', error);
        }
    }

    /**
     * Schedule reconnection.
     */
    private _scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Kline] Max reconnect attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        console.log(`[Kline] Reconnecting in ${delay}ms...`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this._connect();
                // Resubscribe to all streams
                const streams = Array.from(this.subscriptions.values()).map(s => s.streamName);
                if (streams.length > 0) {
                    this._sendSubscribe(streams);
                }
            } catch (error) {
                this._scheduleReconnect();
            }
        }, delay);
    }

    /**
     * Disconnect.
     */
    disconnect(): void {
        this.isIntentionallyClosed = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.callbacks.clear();
    }

    /**
     * Get stats.
     */
    getStats() {
        return {
            isConnected: this.ws?.readyState === WebSocket.OPEN,
            subscriptions: this.subscriptions.size,
            streams: Array.from(this.subscriptions.keys()),
        };
    }
}

// Singleton
export const klineStreamService = new KlineStreamService();
