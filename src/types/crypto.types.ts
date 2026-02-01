// Crypto type definitions for real-time data

export interface LivePrice {
    symbol: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
    quoteVolume: number;
    lastUpdate: number;
    direction: 'up' | 'down' | 'neutral';
}

export interface CryptoAsset {
    id: string;
    symbol: string;
    name: string;
    icon: string;
    color: string;
}

export interface WebSocketState {
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempts: number;
    lastMessage: number | null;
    error: string | null;
}

export interface PriceUpdate {
    symbol: string;
    price: number;
    previousPrice: number;
    timestamp: number;
}

// Binance WebSocket message types
export interface BinanceTickerMessage {
    e: string;      // Event type
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
    v: string;      // Total traded base asset volume
    q: string;      // Total traded quote asset volume
    O: number;      // Statistics open time
    C: number;      // Statistics close time
    F: number;      // First trade ID
    L: number;      // Last trade Id
    n: number;      // Total number of trades
}

// Coin configuration - prices streamed via USDT pairs and converted to INR
export const SUPPORTED_COINS: CryptoAsset[] = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: '#F7931A' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB', icon: '◈', color: '#F3BA2F' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', icon: '✕', color: '#23292F' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', icon: '◎', color: '#9945FF' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: '#C2A633' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', icon: '₳', color: '#0033AD' },
    { id: 'tron', symbol: 'TRX', name: 'TRON', icon: '⟁', color: '#FF0013' },
    { id: 'shiba', symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', color: '#FFA409' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', icon: '●', color: '#E6007A' },
];

// Map symbol to Binance USDT trading pair (prices converted to INR in WebSocketService)
export const symbolToPair = (symbol: string): string => `${symbol.toLowerCase()}usdt`;
export const pairToSymbol = (pair: string): string => pair.replace('usdt', '').toUpperCase();

