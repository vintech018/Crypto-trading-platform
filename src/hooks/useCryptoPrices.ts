import { useState, useEffect, useRef, useCallback } from 'react';
import { useCrypto } from '../contexts/CryptoContext';

interface LivePrice {
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

interface UseCryptoPriceResult {
    price: LivePrice | undefined;
    isFlashing: boolean;
    flashDirection: 'up' | 'down' | 'neutral';
    formattedPrice: string;
    formattedChange: string;
}

export function useCryptoPrice(symbol: string): UseCryptoPriceResult {
    const { prices, formatPrice, formatPercent } = useCrypto();
    const [isFlashing, setIsFlashing] = useState(false);
    const [flashDirection, setFlashDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
    const previousPriceRef = useRef<number | null>(null);

    const priceData = prices.get(symbol);

    // Convert to LivePrice format
    const price: LivePrice | undefined = priceData ? {
        symbol: priceData.symbol,
        price: priceData.price,
        priceChangePercent: priceData.priceChangePercent,
        high24h: priceData.high24h,
        low24h: priceData.low24h,
        volume: priceData.volume,
        quoteVolume: priceData.quoteVolume,
        timestamp: priceData.timestamp,
        direction: priceData.direction,
    } : undefined;

    useEffect(() => {
        if (!price) return;

        const prevPrice = previousPriceRef.current;
        if (prevPrice !== null && prevPrice !== price.price) {
            setFlashDirection(price.price > prevPrice ? 'up' : 'down');
            setIsFlashing(true);

            const timeout = setTimeout(() => {
                setIsFlashing(false);
            }, 500);

            return () => clearTimeout(timeout);
        }
        previousPriceRef.current = price.price;
    }, [price?.price]);

    return {
        price,
        isFlashing,
        flashDirection,
        formattedPrice: price ? formatPrice(price.price) : '--',
        formattedChange: price ? formatPercent(price.priceChangePercent) : '--',
    };
}

interface UseLivePricesResult {
    prices: Map<string, LivePrice>;
    isConnected: boolean;
    getPriceData: (symbol: string) => {
        price: LivePrice | undefined;
        formattedPrice: string;
        formattedChange: string;
        isPositive: boolean;
    };
}

export function useLivePrices(): UseLivePricesResult {
    const { prices, connectionState, formatPrice, formatPercent } = useCrypto();

    // Convert prices map to LivePrice format
    const livePrices = new Map<string, LivePrice>();
    for (const [symbol, data] of prices) {
        livePrices.set(symbol, {
            symbol: data.symbol,
            price: data.price,
            priceChangePercent: data.priceChangePercent,
            high24h: data.high24h,
            low24h: data.low24h,
            volume: data.volume,
            quoteVolume: data.quoteVolume,
            timestamp: data.timestamp,
            direction: data.direction,
        });
    }

    const getPriceData = useCallback((symbol: string) => {
        const priceData = prices.get(symbol);
        const price: LivePrice | undefined = priceData ? {
            symbol: priceData.symbol,
            price: priceData.price,
            priceChangePercent: priceData.priceChangePercent,
            high24h: priceData.high24h,
            low24h: priceData.low24h,
            volume: priceData.volume,
            quoteVolume: priceData.quoteVolume,
            timestamp: priceData.timestamp,
            direction: priceData.direction,
        } : undefined;

        return {
            price,
            formattedPrice: price ? formatPrice(price.price) : '--',
            formattedChange: price ? formatPercent(price.priceChangePercent) : '--',
            isPositive: price ? price.priceChangePercent >= 0 : true,
        };
    }, [prices, formatPrice, formatPercent]);

    return {
        prices: livePrices,
        isConnected: connectionState.isConnected,
        getPriceData,
    };
}
