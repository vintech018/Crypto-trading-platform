/**
 * ClientWebSocketHub
 * 
 * WebSocket server that manages client connections and subscriptions.
 * Implements the fan-out pattern: one Binance connection → many clients.
 * 
 * Features:
 * - Per-client symbol subscriptions
 * - Broadcasts only relevant updates
 * - Scales to thousands of clients
 * - Heartbeat monitoring
 * - Graceful disconnect handling
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { EventEmitter } from 'events';
import type { Server } from 'http';
import type {
    ClientMessage,
    ServerMessage,
    PriceUpdate
} from '../types/market.types.js';

interface ClientState {
    id: string;
    ws: WebSocket;
    subscriptions: Set<string>;
    lastPing: number;
    isAlive: boolean;
}

export class ClientWebSocketHub extends EventEmitter {
    private wss: WebSocketServer | null = null;
    private clients: Map<string, ClientState> = new Map();
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private clientIdCounter = 0;

    // Stats
    private messagesSent = 0;
    private messagesReceived = 0;

    constructor() {
        super();
    }

    /**
     * Attach to an HTTP server and start accepting WebSocket connections.
     */
    attach(server: Server): void {
        this.wss = new WebSocketServer({ server, path: '/ws' });

        this.wss.on('connection', (ws) => {
            this._handleConnection(ws);
        });

        this._startHeartbeat();

        console.log('[Hub] WebSocket server started on /ws');
    }

    /**
     * Handle a new client connection.
     */
    private _handleConnection(ws: WebSocket): void {
        const clientId = `client_${++this.clientIdCounter}`;

        const clientState: ClientState = {
            id: clientId,
            ws,
            subscriptions: new Set(),
            lastPing: Date.now(),
            isAlive: true,
        };

        this.clients.set(clientId, clientState);
        console.log(`[Hub] Client connected: ${clientId} (total: ${this.clients.size})`);

        // Send welcome message
        this._send(ws, {
            type: 'connection_status',
            data: `Connected as ${clientId}`,
            timestamp: Date.now(),
        });

        // Handle messages
        ws.on('message', (data) => {
            this._handleMessage(clientState, data);
        });

        // Handle pong
        ws.on('pong', () => {
            clientState.isAlive = true;
            clientState.lastPing = Date.now();
        });

        // Handle close
        ws.on('close', () => {
            this._handleDisconnect(clientState);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`[Hub] Client ${clientId} error:`, error);
        });

        // Emit for tracking
        this.emit('client_connected', clientId);
    }

    /**
     * Handle incoming client message.
     */
    private _handleMessage(client: ClientState, data: RawData): void {
        this.messagesReceived++;

        try {
            const message = JSON.parse(data.toString()) as ClientMessage;

            switch (message.type) {
                case 'subscribe':
                    this._handleSubscribe(client, message.symbols || []);
                    break;

                case 'unsubscribe':
                    this._handleUnsubscribe(client, message.symbols || []);
                    break;

                case 'subscribe_kline':
                    if (message.symbol && message.interval) {
                        this._handleKlineSubscribe(client, message.symbol, message.interval);
                    }
                    break;

                case 'unsubscribe_kline':
                    if (message.symbol && message.interval) {
                        this._handleKlineUnsubscribe(client, message.symbol, message.interval);
                    }
                    break;

                case 'ping':
                    this._send(client.ws, {
                        type: 'pong',
                        timestamp: Date.now(),
                        requestId: message.requestId,
                    });
                    break;

                case 'get_prices':
                    this.emit('get_prices', client, message.symbols);
                    break;

                default:
                    this._send(client.ws, {
                        type: 'error',
                        error: `Unknown message type: ${message.type}`,
                        timestamp: Date.now(),
                    });
            }
        } catch (error) {
            console.error(`[Hub] Invalid message from ${client.id}:`, error);
            this._send(client.ws, {
                type: 'error',
                error: 'Invalid message format',
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Handle kline subscription request.
     */
    private _handleKlineSubscribe(client: ClientState, symbol: string, interval: string): void {
        const key = `${symbol.toUpperCase()}_${interval}`;
        console.log(`[Hub] ${client.id} requesting kline subscription: ${key}`);

        // Emit for the kline stream service to handle
        this.emit('subscribe_kline', client, symbol.toUpperCase(), interval);

        this._send(client.ws, {
            type: 'kline_subscribed',
            data: key,
            timestamp: Date.now(),
        });
    }

    /**
     * Handle kline unsubscription request.
     */
    private _handleKlineUnsubscribe(client: ClientState, symbol: string, interval: string): void {
        const key = `${symbol.toUpperCase()}_${interval}`;
        console.log(`[Hub] ${client.id} unsubscribing from kline: ${key}`);

        // Emit for the kline stream service to handle
        this.emit('unsubscribe_kline', client, symbol.toUpperCase(), interval);

        this._send(client.ws, {
            type: 'kline_unsubscribed',
            data: key,
            timestamp: Date.now(),
        });
    }

    /**
     * Handle subscription request.
     */
    private _handleSubscribe(client: ClientState, symbols: string[]): void {
        const newSymbols: string[] = [];

        for (const symbol of symbols) {
            const upperSymbol = symbol.toUpperCase();
            if (!client.subscriptions.has(upperSymbol)) {
                client.subscriptions.add(upperSymbol);
                newSymbols.push(upperSymbol);
            }
        }

        if (newSymbols.length > 0) {
            console.log(`[Hub] ${client.id} subscribed to:`, newSymbols);

            // Emit for stream orchestrator
            this.emit('subscribe', newSymbols);
        }

        this._send(client.ws, {
            type: 'subscribed',
            data: Array.from(client.subscriptions),
            timestamp: Date.now(),
        });
    }

    /**
     * Handle unsubscription request.
     */
    private _handleUnsubscribe(client: ClientState, symbols: string[]): void {
        const removedSymbols: string[] = [];

        for (const symbol of symbols) {
            const upperSymbol = symbol.toUpperCase();
            if (client.subscriptions.delete(upperSymbol)) {
                removedSymbols.push(upperSymbol);
            }
        }

        if (removedSymbols.length > 0) {
            console.log(`[Hub] ${client.id} unsubscribed from:`, removedSymbols);

            // Check if any other client still needs these symbols
            const orphanedSymbols = removedSymbols.filter(s => !this._isSymbolNeeded(s));
            if (orphanedSymbols.length > 0) {
                this.emit('unsubscribe', orphanedSymbols);
            }
        }

        this._send(client.ws, {
            type: 'unsubscribed',
            data: removedSymbols,
            timestamp: Date.now(),
        });
    }

    /**
     * Handle client disconnect.
     */
    private _handleDisconnect(client: ClientState): void {
        // Find orphaned symbols
        const orphanedSymbols = Array.from(client.subscriptions)
            .filter(s => !this._isSymbolNeededExcept(s, client.id));

        this.clients.delete(client.id);
        console.log(`[Hub] Client disconnected: ${client.id} (remaining: ${this.clients.size})`);

        // Emit unsubscribe for orphaned symbols
        if (orphanedSymbols.length > 0) {
            this.emit('unsubscribe', orphanedSymbols);
        }

        this.emit('client_disconnected', client.id);
    }

    /**
     * Check if any client needs a symbol.
     */
    private _isSymbolNeeded(symbol: string): boolean {
        for (const client of this.clients.values()) {
            if (client.subscriptions.has(symbol)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if any client (except one) needs a symbol.
     */
    private _isSymbolNeededExcept(symbol: string, exceptClientId: string): boolean {
        for (const client of this.clients.values()) {
            if (client.id !== exceptClientId && client.subscriptions.has(symbol)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Broadcast a price update to subscribed clients only.
     */
    broadcast(update: PriceUpdate): void {
        for (const client of this.clients.values()) {
            if (client.ws.readyState === WebSocket.OPEN &&
                client.subscriptions.has(update.symbol)) {
                this._send(client.ws, {
                    type: 'price_update',
                    data: update,
                    timestamp: Date.now(),
                });
            }
        }
    }

    /**
     * Broadcast a batch of price updates.
     */
    broadcastBatch(updates: PriceUpdate[]): void {
        for (const client of this.clients.values()) {
            if (client.ws.readyState !== WebSocket.OPEN) continue;

            // Filter to only subscribed symbols
            const relevantUpdates = updates.filter(u =>
                client.subscriptions.has(u.symbol)
            );

            if (relevantUpdates.length > 0) {
                this._send(client.ws, {
                    type: 'batch_update',
                    data: relevantUpdates,
                    timestamp: Date.now(),
                });
            }
        }
    }

    /**
     * Broadcast to all clients (e.g., for status updates).
     */
    broadcastAll(message: ServerMessage): void {
        for (const client of this.clients.values()) {
            if (client.ws.readyState === WebSocket.OPEN) {
                this._send(client.ws, message);
            }
        }
    }

    /**
     * Send a message to a specific client.
     */
    private _send(ws: WebSocket, message: ServerMessage): void {
        try {
            ws.send(JSON.stringify(message));
            this.messagesSent++;
        } catch (error) {
            console.error('[Hub] Send error:', error);
        }
    }

    /**
     * Start heartbeat monitoring.
     */
    private _startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            for (const client of this.clients.values()) {
                if (!client.isAlive) {
                    console.log(`[Hub] Terminating stale client: ${client.id}`);
                    client.ws.terminate();
                    continue;
                }

                client.isAlive = false;
                try {
                    client.ws.ping();
                } catch (error) {
                    // Client will be terminated on next interval
                }
            }
        }, 30000);
    }

    /**
     * Get all symbols that have at least one subscriber.
     */
    getSubscribedSymbols(): string[] {
        const symbols = new Set<string>();
        for (const client of this.clients.values()) {
            for (const symbol of client.subscriptions) {
                symbols.add(symbol);
            }
        }
        return Array.from(symbols);
    }

    /**
     * Get hub stats.
     */
    getStats() {
        let totalSubscriptions = 0;
        for (const client of this.clients.values()) {
            totalSubscriptions += client.subscriptions.size;
        }

        return {
            clients: this.clients.size,
            totalSubscriptions,
            uniqueSymbols: this.getSubscribedSymbols().length,
            messagesSent: this.messagesSent,
            messagesReceived: this.messagesReceived,
        };
    }

    /**
     * Shutdown the hub.
     */
    shutdown(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        for (const client of this.clients.values()) {
            client.ws.close(1000, 'Server shutting down');
        }

        this.clients.clear();
        this.wss?.close();
        console.log('[Hub] Shutdown complete');
    }
}

// Singleton instance
export const clientWebSocketHub = new ClientWebSocketHub();
