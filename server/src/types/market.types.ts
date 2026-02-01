/**
 * Market Data Types - Production Grade
 * 
 * These types define the core data structures for the real-time
 * crypto intelligence platform.
 */

// ============================================
// COIN METADATA (from CoinGecko REST API)
// ============================================

export interface CoinMetadata {
    id: string;           // CoinGecko ID (e.g., "bitcoin")
    symbol: string;       // Trading symbol (e.g., "btc")
    name: string;         // Full name (e.g., "Bitcoin")
    image?: string;       // Logo URL
    market_cap_rank?: number;
    platforms?: Record<string, string>;
}

export interface CoinSearchResult extends CoinMetadata {
    isLive: boolean;      // Whether we have live price data
    hasStream: boolean;   // Whether actively streaming
}

// ============================================
// PRICE DATA (computed by PriceIntelligenceService)
// ============================================

export interface PriceUpdate {
    symbol: string;           // e.g., "BTC"
    pair: string;             // e.g., "BTCUSDT"
    price_usd: number;
    price_inr: number;
    change_24h: number;       // Percentage
    change_amount: number;    // Absolute USD change
    direction: 'up' | 'down' | 'neutral';
    volatility: 'high' | 'medium' | 'low';
    high_24h: number;
    low_24h: number;
    volume_24h: number;
    quote_volume_24h: number;
    timestamp: number;
    source: 'binance' | 'cache';
}

export interface AggregatedTick {
    symbol: string;
    prices: number[];
    volumes: number[];
    timestamp: number;
}

// ============================================
// BINANCE WEBSOCKET MESSAGES
// ============================================

export interface BinanceTradeMessage {
    e: string;      // Event type: "trade"
    E: number;      // Event time
    s: string;      // Symbol
    t: number;      // Trade ID
    p: string;      // Price
    q: string;      // Quantity
    b: number;      // Buyer order ID
    a: number;      // Seller order ID
    T: number;      // Trade time
    m: boolean;     // Is buyer maker
    M: boolean;     // Ignore
}

export interface BinanceTickerMessage {
    e: string;      // Event type: "24hrTicker"
    E: number;      // Event time
    s: string;      // Symbol
    p: string;      // Price change
    P: string;      // Price change percent
    w: string;      // Weighted average price
    c: string;      // Last price
    Q: string;      // Last quantity
    o: string;      // Open price
    h: string;      // High price
    l: string;      // Low price
    v: string;      // Base volume
    q: string;      // Quote volume
    O: number;      // Statistics open time
    C: number;      // Statistics close time
    F: number;      // First trade ID
    L: number;      // Last trade ID
    n: number;      // Total trades
}

export interface BinanceMiniTickerMessage {
    e: string;      // Event type: "24hrMiniTicker"
    E: number;      // Event time
    s: string;      // Symbol
    c: string;      // Close price
    o: string;      // Open price
    h: string;      // High price
    l: string;      // Low price
    v: string;      // Base volume
    q: string;      // Quote volume
}

export interface BinanceKlineMessage {
    e: string;      // Event type: "kline"
    E: number;      // Event time
    s: string;      // Symbol
    k: {
        t: number;      // Kline start time
        T: number;      // Kline close time
        s: string;      // Symbol
        i: string;      // Interval
        f: number;      // First trade ID
        L: number;      // Last trade ID
        o: string;      // Open price
        c: string;      // Close price
        h: string;      // High price
        l: string;      // Low price
        v: string;      // Base asset volume
        n: number;      // Number of trades
        x: boolean;     // Is this kline closed?
        q: string;      // Quote asset volume
        V: string;      // Taker buy base volume
        Q: string;      // Taker buy quote volume
    };
}

export interface KlineUpdate {
    symbol: string;
    interval: string;
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    isClosed: boolean;
}

// ============================================
// CLIENT WEBSOCKET PROTOCOL
// ============================================

export type ClientMessageType =
    | 'subscribe'
    | 'unsubscribe'
    | 'subscribe_kline'
    | 'unsubscribe_kline'
    | 'ping'
    | 'get_prices';

export interface ClientMessage {
    type: ClientMessageType;
    symbols?: string[];       // For subscribe/unsubscribe
    symbol?: string;          // For kline subscription
    interval?: string;        // For kline interval (1m, 5m, 15m, 1h, 4h, 1d)
    requestId?: string;       // For correlation
}

export type ServerMessageType =
    | 'price_update'
    | 'batch_update'
    | 'kline_update'
    | 'subscribed'
    | 'unsubscribed'
    | 'kline_subscribed'
    | 'kline_unsubscribed'
    | 'error'
    | 'pong'
    | 'connection_status';

export interface ServerMessage {
    type: ServerMessageType;
    data?: PriceUpdate | PriceUpdate[] | KlineUpdate | string[] | string;
    error?: string;
    requestId?: string;
    timestamp: number;
}

// ============================================
// STREAM ORCHESTRATION
// ============================================

export interface StreamSubscription {
    symbol: string;
    pair: string;             // Binance pair (e.g., "btcusdt")
    clientCount: number;      // Reference count
    lastAccessed: number;     // Timestamp
    isActive: boolean;
}

export interface StreamStats {
    activeStreams: number;
    totalClients: number;
    messagesPerSecond: number;
    uptime: number;
}

// ============================================
// CONFIGURATION
// ============================================

export interface ServerConfig {
    port: number;
    wsPort: number;
    binanceWsUrl: string;
    coingeckoBaseUrl: string;
    cacheTtlSeconds: number;
    throttleWindowMs: number;
    maxStreamsPerConnection: number;
    reconnectDelayMs: number;
    heartbeatIntervalMs: number;
    usdtInrRate: number;
}

export const DEFAULT_CONFIG: ServerConfig = {
    port: 3001,
    wsPort: 3001,
    binanceWsUrl: 'wss://stream.binance.com:9443/ws',
    coingeckoBaseUrl: 'https://api.coingecko.com/api/v3',
    cacheTtlSeconds: 86400,       // 24 hours
    throttleWindowMs: 200,        // 200ms aggregation
    maxStreamsPerConnection: 200, // Binance limit is 1024
    reconnectDelayMs: 1000,
    heartbeatIntervalMs: 30000,
    usdtInrRate: 91.68,
};

// ============================================
// SUPPORTED TRADING PAIRS
// ============================================

export const TOP_PAIRS = [
    'btcusdt', 'ethusdt', 'bnbusdt', 'xrpusdt', 'solusdt',
    'adausdt', 'dogeusdt', 'trxusdt', 'dotusdt', 'maticusdt',
    'shibusdt', 'ltcusdt', 'avaxusdt', 'linkusdt', 'atomusdt',
    'uniusdt', 'xlmusdt', 'etcusdt', 'bchusdt', 'aptusdt',
];

export const pairToSymbol = (pair: string): string => {
    return pair.replace(/usdt$/i, '').toUpperCase();
};

export const symbolToPair = (symbol: string): string => {
    return `${symbol.toLowerCase()}usdt`;
};
