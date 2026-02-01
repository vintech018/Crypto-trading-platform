/**
 * CryptoContext - Production Grade
 * 
 * Provides real-time crypto data to the entire application.
 * Connects to backend WebSocket hub for price updates.
 * 
 * Key Features:
 * - Subscribes to symbols for live updates
 * - Currency formatting (USD/INR)
 * - Does NOT calculate prices (backend owns truth)
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { webSocketService } from '../services/WebSocketService';
import { coinSearchService } from '../services/CoinSearchService';
import { useCurrencySettings } from './CurrencyContext';
import type { PriceUpdate } from '../services/types';

// Legacy type compatibility
interface LegacyPriceData {
    symbol: string;
    price: number;
    priceChangePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
    quoteVolume: number;
    timestamp: number;
    direction?: 'up' | 'down' | 'neutral';
}

interface ConnectionState {
    isConnected: boolean;
    reconnectAttempts: number;
    lastUpdate: number | null;
}

interface CryptoContextType {
    prices: Map<string, LegacyPriceData>;
    rawPrices: Map<string, PriceUpdate>;
    connectionState: ConnectionState;
    formatPrice: (price: number) => string;
    formatPercent: (percent: number) => string;
    formatVolume: (volume: number) => string;
    subscribe: (symbols: string[]) => void;
    unsubscribe: (symbols: string[]) => void;
}

const CryptoContext = createContext<CryptoContextType | null>(null);

export const useCrypto = () => {
    const context = useContext(CryptoContext);
    if (!context) {
        throw new Error('useCrypto must be used within CryptoProvider');
    }
    return context;
};

// Default symbols to subscribe on startup
const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'TRX', 'DOT', 'MATIC'];

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [prices, setPrices] = useState<Map<string, LegacyPriceData>>(new Map());
    const [rawPrices, setRawPrices] = useState<Map<string, PriceUpdate>>(new Map());
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        isConnected: false,
        reconnectAttempts: 0,
        lastUpdate: null,
    });

    const { currency } = useCurrencySettings();

    // Connect to backend WebSocket on mount
    useEffect(() => {
        // Initialize coin search service
        coinSearchService.loadCoins().catch(console.error);

        // Connect to WebSocket
        webSocketService.connect();

        // Subscribe to connection state changes
        const unsubState = webSocketService.onStateChange((state) => {
            setConnectionState(prev => ({
                ...prev,
                isConnected: state === 'connected',
            }));

            // Subscribe to default symbols when connected
            if (state === 'connected') {
                webSocketService.subscribe(DEFAULT_SYMBOLS);
            }
        });

        // Subscribe to price updates
        const unsubPrices = webSocketService.onPrices((priceMap) => {
            // Store raw prices
            setRawPrices(new Map(priceMap));

            // Convert to legacy format for backward compatibility
            const legacyPrices = new Map<string, LegacyPriceData>();

            for (const [symbol, update] of priceMap) {
                // Use INR or USD based on currency setting
                const price = currency === 'INR' ? update.price_inr : update.price_usd;
                const high24h = currency === 'INR' ? update.high_24h * 91.68 : update.high_24h;
                const low24h = currency === 'INR' ? update.low_24h * 91.68 : update.low_24h;

                legacyPrices.set(symbol, {
                    symbol,
                    price,
                    priceChangePercent: update.change_24h,
                    high24h,
                    low24h,
                    volume: update.volume_24h,
                    quoteVolume: update.quote_volume_24h,
                    timestamp: update.timestamp,
                    direction: update.direction,
                });
            }

            setPrices(legacyPrices);
            setConnectionState(prev => ({
                ...prev,
                lastUpdate: Date.now(),
            }));
        });

        // Cleanup
        return () => {
            unsubState();
            unsubPrices();
            webSocketService.disconnect();
        };
    }, [currency]);

    // Subscribe to additional symbols
    const subscribe = useCallback((symbols: string[]) => {
        webSocketService.subscribe(symbols);
    }, []);

    // Unsubscribe from symbols
    const unsubscribe = useCallback((symbols: string[]) => {
        webSocketService.unsubscribe(symbols);
    }, []);

    // Format price in selected currency
    const formatPrice = useCallback((price: number): string => {
        if (currency === 'INR') {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: price < 100 ? 4 : 2,
            }).format(price);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: price < 1 ? 6 : 2,
        }).format(price);
    }, [currency]);

    // Format percentage
    const formatPercent = useCallback((percent: number): string => {
        const sign = percent >= 0 ? '+' : '';
        return `${sign}${percent.toFixed(2)}%`;
    }, []);

    // Format volume
    const formatVolume = useCallback((volume: number): string => {
        return new Intl.NumberFormat('en-IN', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2,
        }).format(volume);
    }, []);

    const value = useMemo(() => ({
        prices,
        rawPrices,
        connectionState,
        formatPrice,
        formatPercent,
        formatVolume,
        subscribe,
        unsubscribe,
    }), [prices, rawPrices, connectionState, formatPrice, formatPercent, formatVolume, subscribe, unsubscribe]);

    return (
        <CryptoContext.Provider value={value}>
            {children}
        </CryptoContext.Provider>
    );
};
