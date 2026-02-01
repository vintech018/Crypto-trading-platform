/**
 * Kline WebSocket Service - Frontend
 * 
 * Manages WebSocket connection specifically for kline (candlestick) data.
 * Separate from price WebSocket to maintain clean separation of concerns.
 * 
 * CRITICAL: This service DOES NOT update React state.
 * It provides callbacks that are called directly by the chart component.
 * This ensures smooth, flicker-free chart updates.
 */

const WS_URL = 'ws://localhost:3001/ws';

export interface KlineBar {
    time: number;      // Unix timestamp in seconds (for chart)
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface KlineUpdate {
    symbol: string;
    interval: string;
    time: number;      // Unix timestamp in ms (from Binance)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    isClosed: boolean;
}

type KlineCallback = (bar: KlineBar, isClosed: boolean) => void;

interface Subscription {
    symbol: string;
    interval: string;
    callback: KlineCallback;
}

class KlineWebSocketService {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, Subscription> = new Map();
    private isConnecting = false;
    private reconnectTimer: number | null = null;
    private messageQueue: any[] = [];
    private reconnectAttempts = 0;

    constructor() {
        // Don't auto-connect, connect on first subscription
    }

    /**
     * Subscribe to kline updates for a symbol and interval.
     * Returns an unsubscribe function.
     */
    subscribe(symbol: string, interval: string, callback: KlineCallback): () => void {
        const key = `${symbol.toUpperCase()}_${interval}`;

        // Store subscription
        this.subscriptions.set(key, {
            symbol: symbol.toUpperCase(),
            interval,
            callback,
        });

        // Connect if needed
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this._connect();
        } else {
            this._sendSubscribe(symbol, interval);
        }

        console.log(`[KlineWS] Subscribed: ${key}`);

        // Return unsubscribe function
        return () => {
            this.unsubscribe(symbol, interval);
        };
    }

    /**
     * Unsubscribe from kline updates.
     */
    unsubscribe(symbol: string, interval: string): void {
        const key = `${symbol.toUpperCase()}_${interval}`;

        if (this.subscriptions.has(key)) {
            this._sendUnsubscribe(symbol, interval);
            this.subscriptions.delete(key);
            console.log(`[KlineWS] Unsubscribed: ${key}`);
        }

        // Disconnect if no more subscriptions
        if (this.subscriptions.size === 0 && this.ws) {
            console.log('[KlineWS] No more subscriptions, disconnecting...');
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Connect to WebSocket server.
     */
    private _connect(): void {
        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;

        this.isConnecting = true;
        console.log('[KlineWS] Connecting...');

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log('[KlineWS] Connected');
            this.isConnecting = false;
            this.reconnectAttempts = 0;

            // Send queued messages
            while (this.messageQueue.length > 0) {
                const msg = this.messageQueue.shift();
                this.ws?.send(JSON.stringify(msg));
            }

            // Resubscribe to all active subscriptions
            for (const [_key, sub] of this.subscriptions) {
                this._sendSubscribe(sub.symbol, sub.interval);
            }
        };

        this.ws.onmessage = (event) => {
            this._handleMessage(event.data);
        };

        this.ws.onclose = () => {
            console.log('[KlineWS] Disconnected');
            this.isConnecting = false;

            // Only reconnect if we have active subscriptions
            if (this.subscriptions.size > 0) {
                this._scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[KlineWS] Error:', error);
        };
    }

    /**
     * Schedule reconnection with exponential backoff.
     */
    private _scheduleReconnect(): void {
        if (this.reconnectTimer) return;

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        console.log(`[KlineWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this._connect();
        }, delay);
    }

    /**
     * Send subscribe message.
     */
    private _sendSubscribe(symbol: string, interval: string): void {
        const message = {
            type: 'subscribe_kline',
            symbol: symbol.toUpperCase().replace('USDT', ''),
            interval,
        };

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    /**
     * Send unsubscribe message.
     */
    private _sendUnsubscribe(symbol: string, interval: string): void {
        const message = {
            type: 'unsubscribe_kline',
            symbol: symbol.toUpperCase().replace('USDT', ''),
            interval,
        };

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Handle incoming WebSocket message.
     * 
     * CRITICAL: Directly invokes the callback - NO React state updates!
     */
    private _handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);

            // Only handle kline updates
            if (message.type !== 'kline_update') return;

            const kline = message.data as KlineUpdate;
            const key = `${kline.symbol}_${kline.interval}`;
            const subscription = this.subscriptions.get(key);

            if (!subscription) {
                // Try with USDT suffix
                const keyWithUsdt = `${kline.symbol}USDT_${kline.interval}`;
                const subWithUsdt = this.subscriptions.get(keyWithUsdt);
                if (!subWithUsdt) return;

                // Found with USDT suffix
                const bar: KlineBar = {
                    time: Math.floor(kline.time / 1000), // Convert ms to seconds for lightweight-charts
                    open: kline.open,
                    high: kline.high,
                    low: kline.low,
                    close: kline.close,
                    volume: kline.volume,
                };
                subWithUsdt.callback(bar, kline.isClosed);
                return;
            }

            // Convert to chart bar format
            const bar: KlineBar = {
                time: Math.floor(kline.time / 1000), // Convert ms to seconds
                open: kline.open,
                high: kline.high,
                low: kline.low,
                close: kline.close,
                volume: kline.volume,
            };

            // Invoke callback directly - this is where the chart gets updated
            subscription.callback(bar, kline.isClosed);

        } catch (error) {
            console.error('[KlineWS] Message parse error:', error);
        }
    }

    /**
     * Disconnect and cleanup.
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.subscriptions.clear();
        this.messageQueue = [];
        console.log('[KlineWS] Disconnected and cleaned up');
    }

    /**
     * Get connection status.
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get active subscriptions.
     */
    getSubscriptions(): string[] {
        return Array.from(this.subscriptions.keys());
    }
}

// Singleton instance
export const klineWebSocketService = new KlineWebSocketService();
