/**
 * CoinSearchService (Frontend)
 * 
 * Fetches coin metadata from backend and provides instant search.
 * Uses Fuse.js for client-side fuzzy search (sub-50ms).
 */

import Fuse from 'fuse.js';
import type { CoinMetadata, CoinSearchResult } from './types';

const API_BASE = 'http://localhost:3001/api';

class CoinSearchService {
    private coins: CoinMetadata[] = [];
    private fuse: Fuse<CoinMetadata> | null = null;
    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;

    /**
     * Load all coins from backend (call once on app init).
     */
    async loadCoins(): Promise<void> {
        if (this.isLoaded) return;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = this._doLoadCoins();
        return this.loadPromise;
    }

    private async _doLoadCoins(): Promise<void> {
        try {
            // Fetch top coins first for immediate availability
            const response = await fetch(`${API_BASE}/coins/top?limit=500`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            this.coins = await response.json();
            this._buildSearchIndex();
            this.isLoaded = true;

            console.log(`[CoinSearch] Loaded ${this.coins.length} coins`);

            // Load more in background
            this._loadMoreCoins();
        } catch (error) {
            console.error('[CoinSearch] Failed to load coins:', error);
            // Use fallback
            this.coins = this._getFallbackCoins();
            this._buildSearchIndex();
            this.isLoaded = true;
        }
    }

    private async _loadMoreCoins(): Promise<void> {
        try {
            const response = await fetch(`${API_BASE}/coins?limit=5000`);
            if (response.ok) {
                const data = await response.json();
                if (data.coins && data.coins.length > this.coins.length) {
                    this.coins = data.coins;
                    this._buildSearchIndex();
                    console.log(`[CoinSearch] Updated to ${this.coins.length} coins`);
                }
            }
        } catch (error) {
            // Silently fail - we already have top coins
        }
    }

    private _buildSearchIndex(): void {
        this.fuse = new Fuse(this.coins, {
            keys: [
                { name: 'symbol', weight: 2 },
                { name: 'name', weight: 1 },
            ],
            threshold: 0.3,
            ignoreLocation: true,
            minMatchCharLength: 1,
        });
    }

    /**
     * Search coins by query.
     * Returns instantly from local index.
     */
    search(query: string, limit = 20): CoinSearchResult[] {
        if (!this.fuse || !query.trim()) {
            return this.coins.slice(0, limit).map(c => ({
                ...c,
                isLive: false,
                hasStream: false,
            }));
        }

        const results = this.fuse.search(query, { limit });
        return results.map(r => ({
            ...r.item,
            isLive: false,
            hasStream: false,
        }));
    }

    /**
     * Search via backend API (for live status).
     */
    async searchWithLiveStatus(query: string, limit = 20): Promise<CoinSearchResult[]> {
        try {
            const response = await fetch(
                `${API_BASE}/coins/search?q=${encodeURIComponent(query)}&limit=${limit}`
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[CoinSearch] API search failed:', error);
            return this.search(query, limit);
        }
    }

    /**
     * Get all loaded coins.
     */
    getAllCoins(): CoinMetadata[] {
        return this.coins;
    }

    /**
     * Get coin by symbol.
     */
    getBySymbol(symbol: string): CoinMetadata | undefined {
        const upper = symbol.toUpperCase();
        return this.coins.find(c => c.symbol.toUpperCase() === upper);
    }

    private _getFallbackCoins(): CoinMetadata[] {
        return [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', market_cap_rank: 2 },
            { id: 'tether', symbol: 'USDT', name: 'Tether', market_cap_rank: 3 },
            { id: 'binancecoin', symbol: 'BNB', name: 'BNB', market_cap_rank: 4 },
            { id: 'ripple', symbol: 'XRP', name: 'XRP', market_cap_rank: 5 },
            { id: 'solana', symbol: 'SOL', name: 'Solana', market_cap_rank: 6 },
            { id: 'cardano', symbol: 'ADA', name: 'Cardano', market_cap_rank: 7 },
            { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', market_cap_rank: 8 },
            { id: 'tron', symbol: 'TRX', name: 'TRON', market_cap_rank: 9 },
            { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', market_cap_rank: 10 },
        ];
    }
}

// Singleton
export const coinSearchService = new CoinSearchService();
