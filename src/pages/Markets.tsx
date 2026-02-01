import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useCrypto } from '../contexts/CryptoContext';
import { SUPPORTED_COINS } from '../types/crypto.types';

type SortKey = 'name' | 'price' | 'change24h' | 'volume';
type SortOrder = 'asc' | 'desc';

const Markets: React.FC = () => {
    const navigate = useNavigate();
    const { prices, connectionState, formatPrice, formatPercent, formatVolume } = useCrypto();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('volume');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const coinsWithPrices = useMemo(() => {
        return SUPPORTED_COINS.map(coin => {
            const livePrice = prices.get(coin.symbol);
            return {
                ...coin,
                price: livePrice?.price || 0,
                priceChangePercent: livePrice?.priceChangePercent || 0,
                volume: livePrice?.quoteVolume || 0,
                direction: livePrice?.direction || 'neutral',
                high24h: livePrice?.high24h || 0,
                low24h: livePrice?.low24h || 0,
            };
        });
    }, [prices]);

    const topGainers = useMemo(() => {
        return [...coinsWithPrices]
            .filter(c => c.price > 0)
            .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
            .slice(0, 3);
    }, [coinsWithPrices]);

    const topLosers = useMemo(() => {
        return [...coinsWithPrices]
            .filter(c => c.price > 0)
            .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
            .slice(0, 3);
    }, [coinsWithPrices]);

    const filteredAndSortedCoins = useMemo(() => {
        let result = coinsWithPrices.filter(
            (coin) =>
                coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        );

        result.sort((a, b) => {
            let comparison = 0;
            switch (sortKey) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'price':
                    comparison = a.price - b.price;
                    break;
                case 'change24h':
                    comparison = a.priceChangePercent - b.priceChangePercent;
                    break;
                case 'volume':
                    comparison = a.volume - b.volume;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [coinsWithPrices, searchQuery, sortKey, sortOrder]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return null;
        return sortOrder === 'asc' ? (
            <ChevronUp className="w-4 h-4 inline ml-1" />
        ) : (
            <ChevronDown className="w-4 h-4 inline ml-1" />
        );
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Markets</h1>
                        <p className="text-slate-400">Live cryptocurrency prices from Binance.</p>
                    </div>
                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${connectionState.isConnected
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                        {connectionState.isConnected ? (
                            <><Wifi className="w-4 h-4" /> Live</>
                        ) : (
                            <><WifiOff className="w-4 h-4" /> Connecting...</>
                        )}
                    </div>
                </motion.div>

                {/* Top Movers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Top Gainers */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <h2 className="text-lg font-semibold text-white">Top Gainers</h2>
                        </div>
                        <div className="space-y-3">
                            {topGainers.map((coin, index) => (
                                <div
                                    key={coin.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer"
                                    onClick={() => navigate('/trade')}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 text-sm w-6">{index + 1}</span>
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                                            style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                        >
                                            {coin.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{coin.symbol}</p>
                                            <p className="text-slate-500 text-xs">{formatPrice(coin.price)}</p>
                                        </div>
                                    </div>
                                    <span className="text-green-400 font-semibold">
                                        {formatPercent(coin.priceChangePercent)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Top Losers */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                            <h2 className="text-lg font-semibold text-white">Top Losers</h2>
                        </div>
                        <div className="space-y-3">
                            {topLosers.map((coin, index) => (
                                <div
                                    key={coin.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    onClick={() => navigate('/trade')}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500 text-sm w-6">{index + 1}</span>
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                                            style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                        >
                                            {coin.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{coin.symbol}</p>
                                            <p className="text-slate-500 text-xs">{formatPrice(coin.price)}</p>
                                        </div>
                                    </div>
                                    <span className="text-red-400 font-semibold">
                                        {formatPercent(coin.priceChangePercent)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                >
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search cryptocurrencies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>
                </motion.div>

                {/* Market Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 bg-slate-900/30">
                                        <th className="text-left py-4 pl-4 text-slate-400 font-medium text-sm w-12">#</th>
                                        <th
                                            className="text-left py-4 text-slate-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            Name <SortIcon columnKey="name" />
                                        </th>
                                        <th
                                            className="text-left py-4 text-slate-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('price')}
                                        >
                                            Price <SortIcon columnKey="price" />
                                        </th>
                                        <th
                                            className="text-left py-4 text-slate-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('change24h')}
                                        >
                                            24h Change <SortIcon columnKey="change24h" />
                                        </th>
                                        <th className="text-left py-4 text-slate-400 font-medium text-sm hidden md:table-cell">
                                            24h High
                                        </th>
                                        <th className="text-left py-4 text-slate-400 font-medium text-sm hidden md:table-cell">
                                            24h Low
                                        </th>
                                        <th
                                            className="text-left py-4 pr-4 text-slate-400 font-medium text-sm cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('volume')}
                                        >
                                            Volume <SortIcon columnKey="volume" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedCoins.map((coin, index) => {
                                        const isPositive = coin.priceChangePercent >= 0;
                                        return (
                                            <motion.tr
                                                key={coin.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                onClick={() => navigate('/trade')}
                                                className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${coin.direction === 'up' ? 'animate-flash-green' :
                                                        coin.direction === 'down' ? 'animate-flash-red' : ''
                                                    }`}
                                            >
                                                <td className="py-4 pl-4">
                                                    <span className="text-slate-500 text-sm">{index + 1}</span>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                                                            style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                                        >
                                                            {coin.icon}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white">{coin.name}</p>
                                                            <p className="text-slate-500 text-sm">{coin.symbol}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`font-medium transition-colors ${coin.direction === 'up' ? 'text-green-400' :
                                                            coin.direction === 'down' ? 'text-red-400' : 'text-white'
                                                        }`}>
                                                        {coin.price > 0 ? formatPrice(coin.price) : '--'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {formatPercent(coin.priceChangePercent)}
                                                    </div>
                                                </td>
                                                <td className="py-4 hidden md:table-cell">
                                                    <span className="text-slate-300">
                                                        {coin.high24h > 0 ? formatPrice(coin.high24h) : '--'}
                                                    </span>
                                                </td>
                                                <td className="py-4 hidden md:table-cell">
                                                    <span className="text-slate-300">
                                                        {coin.low24h > 0 ? formatPrice(coin.low24h) : '--'}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="text-slate-400">
                                                        {coin.volume > 0 ? `$${formatVolume(coin.volume)}` : '--'}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default Markets;
