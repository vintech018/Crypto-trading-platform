/**
 * Watchlist Component
 * 
 * Persistent watchlist with live price updates.
 * Stored in localStorage for persistence.
 * 
 * Features:
 * - Add/remove coins
 * - Live prices from WebSocket
 * - Compact mobile-friendly view
 * - Price direction indicators
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, X, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useCrypto } from '../contexts/CryptoContext';

interface WatchlistProps {
    onSelectCoin?: (symbol: string) => void;
    compact?: boolean;
}

const STORAGE_KEY = 'crypto_watchlist';

const DEFAULT_WATCHLIST = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];

const Watchlist: React.FC<WatchlistProps> = ({ onSelectCoin, compact = false }) => {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newSymbol, setNewSymbol] = useState('');

    const { prices, subscribe, formatPrice, formatPercent, connectionState } = useCrypto();

    // Load watchlist from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setWatchlist(parsed);
                // Subscribe to watchlist symbols
                subscribe(parsed);
            } catch {
                setWatchlist(DEFAULT_WATCHLIST);
                subscribe(DEFAULT_WATCHLIST);
            }
        } else {
            setWatchlist(DEFAULT_WATCHLIST);
            subscribe(DEFAULT_WATCHLIST);
        }
    }, [subscribe]);

    // Save watchlist to localStorage
    useEffect(() => {
        if (watchlist.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
        }
    }, [watchlist]);

    // Add coin to watchlist
    const addCoin = (symbol: string) => {
        const upperSymbol = symbol.toUpperCase().trim();
        if (upperSymbol && !watchlist.includes(upperSymbol)) {
            const newWatchlist = [...watchlist, upperSymbol];
            setWatchlist(newWatchlist);
            subscribe([upperSymbol]);
        }
        setNewSymbol('');
        setIsAdding(false);
    };

    // Remove coin from watchlist
    const removeCoin = (symbol: string) => {
        setWatchlist(prev => prev.filter(s => s !== symbol));
    };

    // Handle form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSymbol) {
            addCoin(newSymbol);
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {watchlist.map((symbol) => {
                    const priceData = prices.get(symbol);
                    const isPositive = (priceData?.priceChangePercent || 0) >= 0;

                    return (
                        <button
                            key={symbol}
                            onClick={() => onSelectCoin?.(symbol)}
                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                        >
                            <span className="font-medium text-white">{symbol}</span>
                            {priceData && (
                                <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatPercent(priceData.priceChangePercent)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-semibold text-white">Watchlist</h3>
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded-full text-xs text-slate-400">
                        {watchlist.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {connectionState.isConnected && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <Zap className="w-3 h-3" />
                            Live
                        </span>
                    )}

                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {isAdding ? (
                            <X className="w-4 h-4 text-slate-400" />
                        ) : (
                            <Plus className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {isAdding && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="px-4 py-3 border-b border-white/10"
                    >
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                placeholder="Enter symbol (e.g., ADA)"
                                className="flex-1 px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!newSymbol}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Watchlist Items */}
            <div className="divide-y divide-white/5">
                {watchlist.map((symbol) => {
                    const priceData = prices.get(symbol);
                    const isPositive = (priceData?.priceChangePercent || 0) >= 0;
                    const direction = priceData?.direction;

                    return (
                        <motion.div
                            key={symbol}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer group"
                            onClick={() => onSelectCoin?.(symbol)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                    <span className="text-sm font-bold text-slate-300">
                                        {symbol.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium text-white">{symbol}</p>
                                    <p className="text-xs text-slate-500">{symbol}/USDT</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {priceData ? (
                                    <>
                                        <div className="text-right">
                                            <p className={`font-medium transition-colors ${direction === 'up' ? 'text-green-400' :
                                                    direction === 'down' ? 'text-red-400' : 'text-white'
                                                }`}>
                                                {formatPrice(priceData.price)}
                                            </p>
                                            <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {isPositive ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
                                                {formatPercent(priceData.priceChangePercent)}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-slate-500 text-sm">Loading...</div>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeCoin(symbol);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                >
                                    <X className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}

                {watchlist.length === 0 && (
                    <div className="px-4 py-8 text-center text-slate-500">
                        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No coins in watchlist</p>
                        <p className="text-sm">Click + to add coins</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Watchlist;
