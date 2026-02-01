/**
 * BinanceStreamManager
 * 
 * Manages a SINGLE WebSocket connection to Binance.
 * Implements dynamic subscription/unsubscription without reconnecting.
 * 
 * Architecture Decisions:
 * - ONE connection serves ALL clients (fan-out pattern)
 * - Dynamic stream management via SUBSCRIBE/UNSUBSCRIBE
 * - Auto-reconnect with exponential backoff
 * - Heartbeat monitoring
 * 
 * Why single connection?
 * - Binance limits connections per IP
 * - Reduces resource usage
 * - Scales to thousands of users
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { BinanceTickerMessage } from '../types/market.types.js';
import { DEFAULT_CONFIG, TOP_PAIRS } from '../types/market.types.js';

type TickerCallback = (ticker: BinanceTickerMessage) => void;

export class BinanceStreamManager extends EventEmitter {
    private ws: WebSocket | null = null;
    private activeStreams: Set<string> = new Set();
    private pendingSubscriptions: Set<string> = new Set();
    private pendingUnsubscriptions: Set<string> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private lastMessageTime = 0;
    private isIntentionallyClosed = false;
    private messageId = 1;
    private tickerCallbacks: Set<TickerCallback> = new Set();

    // Stats
    private messagesReceived = 0;
    private connectionStartTime = 0;

    constructor() {
        super();
    }

    /**
     * Connect to Binance WebSocket and subscribe to initial streams.
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[Binance] Already connected');
            return;
        }

        this.isIntentionallyClosed = false;

        // Build combined stream URL for initial subscriptions
        const streams = TOP_PAIRS.map(pair => `${pair}@ticker`).join('/');
        const url = `${DEFAULT_CONFIG.binanceWsUrl}/${streams}`;

        console.log(`[Binance] Connecting to ${TOP_PAIRS.length} initial streams...`);

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);

                this.ws.on('open', () => {
                    console.log('[Binance] Connected successfully');
                    this.reconnectAttempts = 0;
                    this.connectionStartTime = Date.now();
                    this.lastMessageTime = Date.now();

                    // Mark initial streams as active
                    TOP_PAIRS.forEach(pair => this.activeStreams.add(`${pair}@ticker`));

                    // Start heartbeat monitoring
                    this._startHeartbeat();

                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    this._handleMessage(data);
                });

                this.ws.on('error', (error) => {
                    console.error('[Binance] WebSocket error:', error);
                    this.emit('error', error);
                });

                this.ws.on('close', (code, reason) => {
                    console.log(`[Binance] Connection closed: ${code} - ${reason}`);
                    this._stopHeartbeat();
                    this.emit('disconnected', code);

                    if (!this.isIntentionallyClosed) {
                        this._scheduleReconnect();
                    }
                });

                this.ws.on('pong', () => {
                    this.lastMessageTime = Date.now();
                });

            } catch (error) {
                console.error('[Binance] Connection failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Subscribe to additional streams dynamically.
     */
    subscribe(pairs: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Queue for later
            pairs.forEach(p => this.pendingSubscriptions.add(`${p}@ticker`));
            return;
        }

        const streams = pairs
            .map(p => `${p.toLowerCase()}@ticker`)
            .filter(s => !this.activeStreams.has(s));

        if (streams.length === 0) return;

        const message = {
            method: 'SUBSCRIBE',
            params: streams,
            id: this.messageId++,
        };

        this.ws.send(JSON.stringify(message));
        streams.forEach(s => this.activeStreams.add(s));

        console.log(`[Binance] Subscribed to ${streams.length} streams:`, streams);
    }

    /**
     * Unsubscribe from streams.
     */
    unsubscribe(pairs: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            pairs.forEach(p => this.pendingUnsubscriptions.add(`${p}@ticker`));
            return;
        }

        const streams = pairs
            .map(p => `${p.toLowerCase()}@ticker`)
            .filter(s => this.activeStreams.has(s));

        if (streams.length === 0) return;

        const message = {
            method: 'UNSUBSCRIBE',
            params: streams,
            id: this.messageId++,
        };

        this.ws.send(JSON.stringify(message));
        streams.forEach(s => this.activeStreams.delete(s));

        console.log(`[Binance] Unsubscribed from ${streams.length} streams`);
    }

    /**
     * Register a callback for ticker updates.
     */
    onTicker(callback: TickerCallback): () => void {
        this.tickerCallbacks.add(callback);
        return () => this.tickerCallbacks.delete(callback);
    }

    /**
     * Handle incoming WebSocket messages.
     */
    private _handleMessage(data: WebSocket.Data): void {
        this.lastMessageTime = Date.now();
        this.messagesReceived++;

        try {
            const message = JSON.parse(data.toString());

            // Handle subscription confirmations
            if (message.result !== undefined) {
                console.log('[Binance] Subscription response:', message);
                return;
            }

            // Handle combined stream format
            if (message.stream && message.data) {
                const ticker = message.data as BinanceTickerMessage;
                this._notifyTicker(ticker);
                return;
            }

            // Handle direct ticker format
            if (message.e === '24hrTicker') {
                this._notifyTicker(message as BinanceTickerMessage);
                return;
            }

        } catch (error) {
            console.error('[Binance] Failed to parse message:', error);
        }
    }

    /**
     * Notify all registered callbacks of a ticker update.
     */
    private _notifyTicker(ticker: BinanceTickerMessage): void {
        for (const callback of this.tickerCallbacks) {
            try {
                callback(ticker);
            } catch (error) {
                console.error('[Binance] Ticker callback error:', error);
            }
        }
        this.emit('ticker', ticker);
    }

    /**
     * Start heartbeat monitoring.
     */
    private _startHeartbeat(): void {
        this._stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            // Check for stale connection
            const timeSinceLastMessage = Date.now() - this.lastMessageTime;
            if (timeSinceLastMessage > 60000) {
                console.warn('[Binance] Connection appears stale, reconnecting...');
                this.ws.close();
                return;
            }

            // Send ping
            try {
                this.ws.ping();
            } catch (error) {
                console.error('[Binance] Ping failed:', error);
            }
        }, DEFAULT_CONFIG.heartbeatIntervalMs);
    }

    /**
     * Stop heartbeat monitoring.
     */
    private _stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnection with exponential backoff.
     */
    private _scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Binance] Max reconnection attempts reached');
            this.emit('max_reconnect_failed');
            return;
        }

        const delay = Math.min(
            DEFAULT_CONFIG.reconnectDelayMs * Math.pow(2, this.reconnectAttempts),
            30000
        );

        this.reconnectAttempts++;
        console.log(`[Binance] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.connect();

                // Resubscribe to active streams
                if (this.activeStreams.size > 0) {
                    const pairs = Array.from(this.activeStreams)
                        .map(s => s.replace('@ticker', ''));
                    this.subscribe(pairs);
                }

                // Process pending subscriptions
                if (this.pendingSubscriptions.size > 0) {
                    const pairs = Array.from(this.pendingSubscriptions)
                        .map(s => s.replace('@ticker', ''));
                    this.subscribe(pairs);
                    this.pendingSubscriptions.clear();
                }
            } catch (error) {
                console.error('[Binance] Reconnection failed:', error);
                this._scheduleReconnect();
            }
        }, delay);
    }

    /**
     * Disconnect from Binance.
     */
    disconnect(): void {
        this.isIntentionallyClosed = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this._stopHeartbeat();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.activeStreams.clear();
        console.log('[Binance] Disconnected intentionally');
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get active streams.
     */
    getActiveStreams(): string[] {
        return Array.from(this.activeStreams);
    }

    /**
     * Get connection stats.
     */
    getStats() {
        return {
            isConnected: this.isConnected(),
            activeStreams: this.activeStreams.size,
            messagesReceived: this.messagesReceived,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
            lastMessageTime: this.lastMessageTime,
        };
    }
}

// Singleton instance
export const binanceStreamManager = new BinanceStreamManager();
