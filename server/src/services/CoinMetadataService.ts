/**
 * CoinMetadataService
 * 
 * Fetches and caches ALL cryptocurrency metadata from CoinGecko.
 * Provides instant search across 14,000+ coins without hitting any API.
 * 
 * Architecture Decision:
 * - REST API for breadth (metadata for all coins)
 * - Cache aggressively (24 hour TTL)
 * - Fuse.js for sub-50ms fuzzy search
 */

import NodeCache from 'node-cache';
import Fuse from 'fuse.js';
import type { CoinMetadata, CoinSearchResult } from '../types/market.types.js';
import { DEFAULT_CONFIG } from '../types/market.types.js';

export class CoinMetadataService {
    private cache: NodeCache;
    private coins: CoinMetadata[] = [];
    private fuse: Fuse<CoinMetadata> | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private liveSymbols: Set<string> = new Set();

    constructor() {
        this.cache = new NodeCache({
            stdTTL: DEFAULT_CONFIG.cacheTtlSeconds,
            checkperiod: 3600, // Check for expired entries every hour
        });
    }

    /**
     * Initialize the service by fetching all coins from CoinGecko.
     * This should be called once at server startup.
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    private async _doInitialize(): Promise<void> {
        console.log('[CoinMetadata] Initializing coin universe...');

        try {
            // Check cache first
            const cached = this.cache.get<CoinMetadata[]>('all_coins');
            if (cached) {
                this.coins = cached;
                this._buildSearchIndex();
                this.isInitialized = true;
                console.log(`[CoinMetadata] Loaded ${this.coins.length} coins from cache`);
                return;
            }

            // Fetch from CoinGecko
            const response = await fetch(
                `${DEFAULT_CONFIG.coingeckoBaseUrl}/coins/list?include_platform=false`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json() as CoinMetadata[];
            this.coins = data;

            // Cache for 24 hours
            this.cache.set('all_coins', this.coins);

            // Build search index
            this._buildSearchIndex();

            this.isInitialized = true;
            console.log(`[CoinMetadata] Loaded ${this.coins.length} coins from CoinGecko`);

            // Fetch additional market data for top coins (async, non-blocking)
            this._fetchMarketCapRanks().catch(err => {
                console.error('[CoinMetadata] Failed to fetch market cap ranks:', err);
            });

        } catch (error) {
            console.error('[CoinMetadata] Initialization failed:', error);
            // Use fallback data
            this.coins = this._getFallbackCoins();
            this._buildSearchIndex();
            this.isInitialized = true;
        }
    }

    /**
     * Build Fuse.js search index for instant fuzzy search.
     */
    private _buildSearchIndex(): void {
        this.fuse = new Fuse(this.coins, {
            keys: [
                { name: 'symbol', weight: 2 },
                { name: 'name', weight: 1 },
                { name: 'id', weight: 0.5 },
            ],
            threshold: 0.3,        // Fuzzy match tolerance
            ignoreLocation: true,  // Match anywhere in string
            minMatchCharLength: 1,
        });
        console.log('[CoinMetadata] Search index built');
    }

    /**
     * Search coins by symbol, name, or ID.
     * Returns instantly (sub-50ms) from local index.
     */
    search(query: string, limit = 20): CoinSearchResult[] {
        if (!this.fuse || !query.trim()) {
            return this.coins.slice(0, limit).map(c => this._toSearchResult(c));
        }

        const results = this.fuse.search(query, { limit });
        return results.map(r => this._toSearchResult(r.item));
    }

    /**
     * Get coin by symbol (exact match).
     */
    getBySymbol(symbol: string): CoinMetadata | undefined {
        const upperSymbol = symbol.toUpperCase();
        return this.coins.find(c => c.symbol.toUpperCase() === upperSymbol);
    }

    /**
     * Get coin by CoinGecko ID.
     */
    getById(id: string): CoinMetadata | undefined {
        return this.coins.find(c => c.id === id);
    }

    /**
     * Get all coins (for initial UI load).
     */
    getAllCoins(): CoinMetadata[] {
        return this.coins;
    }

    /**
     * Get top coins by market cap rank.
     */
    getTopCoins(limit = 100): CoinMetadata[] {
        return this.coins
            .filter(c => c.market_cap_rank !== undefined)
            .sort((a, b) => (a.market_cap_rank || 999999) - (b.market_cap_rank || 999999))
            .slice(0, limit);
    }

    /**
     * Mark a symbol as having live price data.
     */
    setLiveSymbol(symbol: string, isLive: boolean): void {
        if (isLive) {
            this.liveSymbols.add(symbol.toUpperCase());
        } else {
            this.liveSymbols.delete(symbol.toUpperCase());
        }
    }

    /**
     * Check if a symbol has live price data.
     */
    isSymbolLive(symbol: string): boolean {
        return this.liveSymbols.has(symbol.toUpperCase());
    }

    /**
     * Convert CoinMetadata to CoinSearchResult with live status.
     */
    private _toSearchResult(coin: CoinMetadata): CoinSearchResult {
        return {
            ...coin,
            isLive: this.isSymbolLive(coin.symbol),
            hasStream: this.liveSymbols.has(coin.symbol.toUpperCase()),
        };
    }

    /**
     * Fetch market cap ranks for top coins (background task).
     */
    private async _fetchMarketCapRanks(): Promise<void> {
        try {
            const response = await fetch(
                `${DEFAULT_CONFIG.coingeckoBaseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1`
            );

            if (!response.ok) return;

            const data = await response.json() as Array<{
                id: string;
                market_cap_rank: number;
                image: string;
            }>;

            // Update coins with market cap ranks and images
            const rankMap = new Map(data.map(c => [c.id, c]));

            for (const coin of this.coins) {
                const marketData = rankMap.get(coin.id);
                if (marketData) {
                    coin.market_cap_rank = marketData.market_cap_rank;
                    coin.image = marketData.image;
                }
            }

            // Rebuild search index with updated data
            this._buildSearchIndex();

            // Update cache
            this.cache.set('all_coins', this.coins);

            console.log('[CoinMetadata] Updated market cap ranks for top 250 coins');
        } catch (error) {
            console.error('[CoinMetadata] Failed to fetch market data:', error);
        }
    }

    /**
     * Fallback coins if CoinGecko is unavailable.
     */
    private _getFallbackCoins(): CoinMetadata[] {
        return [
            { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', market_cap_rank: 1 },
            { id: 'ethereum', symbol: 'eth', name: 'Ethereum', market_cap_rank: 2 },
            { id: 'tether', symbol: 'usdt', name: 'Tether', market_cap_rank: 3 },
            { id: 'binancecoin', symbol: 'bnb', name: 'BNB', market_cap_rank: 4 },
            { id: 'ripple', symbol: 'xrp', name: 'XRP', market_cap_rank: 5 },
            { id: 'solana', symbol: 'sol', name: 'Solana', market_cap_rank: 6 },
            { id: 'cardano', symbol: 'ada', name: 'Cardano', market_cap_rank: 7 },
            { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', market_cap_rank: 8 },
            { id: 'tron', symbol: 'trx', name: 'TRON', market_cap_rank: 9 },
            { id: 'polkadot', symbol: 'dot', name: 'Polkadot', market_cap_rank: 10 },
        ];
    }

    /**
     * Get service stats.
     */
    getStats() {
        return {
            totalCoins: this.coins.length,
            liveSymbols: this.liveSymbols.size,
            isInitialized: this.isInitialized,
            cacheStats: this.cache.getStats(),
        };
    }
}

// Singleton instance
export const coinMetadataService = new CoinMetadataService();
