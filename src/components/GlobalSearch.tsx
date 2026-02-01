/**
 * GlobalSearch Component
 * 
 * Command palette style search (Cmd+K / Ctrl+K).
 * Searches 14,000+ coins instantly using Fuse.js.
 * 
 * Features:
 * - Keyboard shortcut activation
 * - Sub-50ms fuzzy search
 * - Live/Static badges
 * - Triggers subscription on select
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, X, Zap, Loader2 } from 'lucide-react';
import { coinSearchService } from '../services/CoinSearchService';
import { useCrypto } from '../contexts/CryptoContext';
import type { CoinSearchResult } from '../services/types';

interface GlobalSearchProps {
    onSelect?: (coin: CoinSearchResult) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CoinSearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const { subscribe, prices } = useCrypto();

    // Handle keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            // Load initial results
            const initial = coinSearchService.search('', 10);
            setResults(initial);
        } else {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search coins on query change
    useEffect(() => {
        if (!isOpen) return;

        const searchCoins = async () => {
            setIsLoading(true);

            // First do local search (instant)
            const localResults = coinSearchService.search(query, 20);
            setResults(localResults);

            // Then try API search for live status
            try {
                const apiResults = await coinSearchService.searchWithLiveStatus(query, 20);
                setResults(apiResults);
            } catch (error) {
                // Keep local results
            }

            setIsLoading(false);
        };

        const debounce = setTimeout(searchCoins, 100);
        return () => clearTimeout(debounce);
    }, [query, isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
        }
    }, [results, selectedIndex]);

    // Handle coin selection
    const handleSelect = (coin: CoinSearchResult) => {
        // Subscribe to this coin's price updates
        subscribe([coin.symbol.toUpperCase()]);

        // Callback
        onSelect?.(coin);

        // Close modal
        setIsOpen(false);
    };

    // Check if we have live price for a coin
    const hasLivePrice = (symbol: string): boolean => {
        return prices.has(symbol.toUpperCase());
    };

    return (
        <>
            {/* Search Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-white/20 transition-colors group"
            >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search coins...</span>
                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-500 group-hover:text-slate-400">
                    <Command className="w-3 h-3" />
                    <span>K</span>
                </div>
            </button>

            {/* Search Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
                        >
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                {/* Search Input */}
                                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                                    <Search className="w-5 h-5 text-slate-500" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setSelectedIndex(0);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Search 14,000+ cryptocurrencies..."
                                        className="flex-1 bg-transparent text-white text-lg placeholder-slate-500 focus:outline-none"
                                    />
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                                    ) : (
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    )}
                                </div>

                                {/* Results */}
                                <div className="max-h-[400px] overflow-y-auto">
                                    {results.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-slate-500">
                                            {query ? 'No coins found' : 'Start typing to search...'}
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            {results.map((coin, index) => {
                                                const isLive = hasLivePrice(coin.symbol);
                                                const isSelected = index === selectedIndex;

                                                return (
                                                    <button
                                                        key={coin.id}
                                                        onClick={() => handleSelect(coin)}
                                                        onMouseEnter={() => setSelectedIndex(index)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-indigo-500/20' : 'hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {/* Coin Icon */}
                                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                                            {coin.image ? (
                                                                <img
                                                                    src={coin.image}
                                                                    alt={coin.symbol}
                                                                    className="w-6 h-6 rounded-full"
                                                                />
                                                            ) : (
                                                                <span className="text-lg font-bold text-slate-400">
                                                                    {coin.symbol.charAt(0)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Coin Info */}
                                                        <div className="flex-1 text-left">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-white">
                                                                    {coin.symbol.toUpperCase()}
                                                                </span>
                                                                {isLive && (
                                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                                                        <Zap className="w-3 h-3" />
                                                                        Live
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-slate-500">{coin.name}</span>
                                                        </div>

                                                        {/* Rank */}
                                                        {coin.market_cap_rank && (
                                                            <span className="text-sm text-slate-500">
                                                                #{coin.market_cap_rank}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd>
                                            Navigate
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
                                            Select
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">esc</kbd>
                                            Close
                                        </span>
                                    </div>
                                    <span>Powered by CoinGecko</span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default GlobalSearch;
