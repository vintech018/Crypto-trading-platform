/**
 * WebSocketService (Frontend)
 * 
 * Connects to the BACKEND WebSocket Hub, NOT directly to Binance.
 * 
 * Architecture Decision:
 * - Frontend NEVER talks to Binance directly
 * - Backend owns market data truth
 * - Frontend only visualizes
 * 
 * Protocol:
 * - subscribe: Request price updates for symbols
 * - unsubscribe: Stop receiving updates
 * - price_update: Single price update from server
 * - batch_update: Batched price updates
 */

import type { PriceUpdate } from './types';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
type PriceCallback = (prices: Map<string, PriceUpdate>) => void;
type StateCallback = (state: ConnectionState) => void;

// Server message types
interface ServerMessage {
    type: 'price_update' | 'batch_update' | 'subscribed' | 'unsubscribed' | 'error' | 'pong' | 'connection_status';
    data?: PriceUpdate | PriceUpdate[] | string[];
    error?: string;
    timestamp: number;
}

export class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    private prices: Map<string, PriceUpdate> = new Map();
    private subscribers: Set<PriceCallback> = new Set();
    private stateSubscribers: Set<StateCallback> = new Set();
    private connectionState: ConnectionState = 'disconnected';
    private subscribedSymbols: Set<string> = new Set();

    // Backend WebSocket URL
    private readonly WS_URL = 'ws://localhost:3001/ws';

    /**
     * Connect to the backend WebSocket hub.
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.setConnectionState('connecting');
        console.log('[WS] Connecting to backend...');

        try {
            this.ws = new WebSocket(this.WS_URL);

            this.ws.onopen = () => {
                console.log('[WS] Connected to backend');
                this.reconnectAttempts = 0;
                this.setConnectionState('connected');
                this.startHeartbeat();

                // Resubscribe to previously subscribed symbols
                if (this.subscribedSymbols.size > 0) {
                    this.subscribe(Array.from(this.subscribedSymbols));
                }
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                this.setConnectionState('error');
            };

            this.ws.onclose = (event) => {
                console.log(`[WS] Disconnected: ${event.code}`);
                this.stopHeartbeat();
                this.setConnectionState('disconnected');
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error('[WS] Connection failed:', error);
            this.setConnectionState('error');
            this.scheduleReconnect();
        }
    }

    /**
     * Handle incoming messages from the backend.
     */
    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data) as ServerMessage;

            switch (message.type) {
                case 'price_update':
                    this.handlePriceUpdate(message.data as PriceUpdate);
                    break;

                case 'batch_update':
                    this.handleBatchUpdate(message.data as PriceUpdate[]);
                    break;

                case 'subscribed':
                    console.log('[WS] Subscribed to:', message.data);
                    break;

                case 'unsubscribed':
                    console.log('[WS] Unsubscribed from:', message.data);
                    break;

                case 'connection_status':
                    console.log('[WS] Status:', message.data);
                    break;

                case 'pong':
                    // Heartbeat response
                    break;

                case 'error':
                    console.error('[WS] Server error:', message.error);
                    break;
            }
        } catch (error) {
            console.error('[WS] Failed to parse message:', error);
        }
    }

    /**
     * Handle a single price update.
     */
    private handlePriceUpdate(update: PriceUpdate): void {
        this.prices.set(update.symbol, update);
        this.notifySubscribers();
    }

    /**
     * Handle a batch of price updates.
     */
    private handleBatchUpdate(updates: PriceUpdate[]): void {
        for (const update of updates) {
            this.prices.set(update.symbol, update);
        }
        this.notifySubscribers();
    }

    /**
     * Subscribe to price updates for symbols.
     */
    subscribe(symbols: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Queue for later
            symbols.forEach(s => this.subscribedSymbols.add(s.toUpperCase()));
            return;
        }

        const message = {
            type: 'subscribe',
            symbols: symbols.map(s => s.toUpperCase()),
        };

        this.ws.send(JSON.stringify(message));
        symbols.forEach(s => this.subscribedSymbols.add(s.toUpperCase()));
    }

    /**
     * Unsubscribe from price updates.
     */
    unsubscribe(symbols: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            symbols.forEach(s => this.subscribedSymbols.delete(s.toUpperCase()));
            return;
        }

        const message = {
            type: 'unsubscribe',
            symbols: symbols.map(s => s.toUpperCase()),
        };

        this.ws.send(JSON.stringify(message));
        symbols.forEach(s => this.subscribedSymbols.delete(s.toUpperCase()));
    }

    /**
     * Request current prices (for initial load).
     */
    requestPrices(symbols?: string[]): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const message = {
            type: 'get_prices',
            symbols,
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Register a callback for price updates.
     */
    onPrices(callback: PriceCallback): () => void {
        this.subscribers.add(callback);

        // Immediately send current prices
        if (this.prices.size > 0) {
            callback(this.prices);
        }

        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Register a callback for connection state changes.
     */
    onStateChange(callback: StateCallback): () => void {
        this.stateSubscribers.add(callback);
        callback(this.connectionState);

        return () => {
            this.stateSubscribers.delete(callback);
        };
    }

    /**
     * Notify all price subscribers.
     */
    private notifySubscribers(): void {
        for (const callback of this.subscribers) {
            try {
                callback(this.prices);
            } catch (error) {
                console.error('[WS] Subscriber error:', error);
            }
        }
    }

    /**
     * Set connection state and notify subscribers.
     */
    private setConnectionState(state: ConnectionState): void {
        this.connectionState = state;
        for (const callback of this.stateSubscribers) {
            try {
                callback(state);
            } catch (error) {
                console.error('[WS] State subscriber error:', error);
            }
        }
    }

    /**
     * Start heartbeat to keep connection alive.
     */
    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    /**
     * Stop heartbeat.
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnection with exponential backoff.
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WS] Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Disconnect from the backend.
     */
    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.setConnectionState('disconnected');
    }

    /**
     * Get current prices map.
     */
    getPrices(): Map<string, PriceUpdate> {
        return this.prices;
    }

    /**
     * Get price for a specific symbol.
     */
    getPrice(symbol: string): PriceUpdate | undefined {
        return this.prices.get(symbol.toUpperCase());
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.connectionState === 'connected';
    }

    /**
     * Get connection state.
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }
}

// Singleton instance
export const webSocketService = new WebSocketService();
