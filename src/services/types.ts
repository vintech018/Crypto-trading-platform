/**
 * Frontend Price Types
 * 
 * These types match the backend PriceUpdate structure.
 * Frontend NEVER calculates prices - it only displays what backend sends.
 */

export interface PriceUpdate {
    symbol: string;
    pair: string;
    price_usd: number;
    price_inr: number;
    change_24h: number;
    change_amount: number;
    direction: 'up' | 'down' | 'neutral';
    volatility: 'high' | 'medium' | 'low';
    high_24h: number;
    low_24h: number;
    volume_24h: number;
    quote_volume_24h: number;
    timestamp: number;
    source: 'binance' | 'cache';
}

export interface CoinMetadata {
    id: string;
    symbol: string;
    name: string;
    image?: string;
    market_cap_rank?: number;
    isLive?: boolean;
    hasStream?: boolean;
}

export interface CoinSearchResult extends CoinMetadata {
    isLive: boolean;
    hasStream: boolean;
}
