import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wifi, WifiOff, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useCrypto } from '../contexts/CryptoContext';
import { SUPPORTED_COINS } from '../types/crypto.types';
import SparklineChart from '../components/crypto/SparklineChart';

// Generate sparkline data based on price direction
const generateSparklineData = (change: number): number[] => {
    const points = 20;
    const data: number[] = [];
    let value = 100;
    for (let i = 0; i < points; i++) {
        value = value + (Math.random() - 0.5 + (change > 0 ? 0.05 : -0.05)) * 5;
        data.push(Math.max(value, 0));
    }
    return data;
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { prices, connectionState, formatPrice, formatPercent, formatVolume } = useCrypto();

    // Calculate portfolio from live prices
    const portfolioData = useMemo(() => {
        const holdings = [
            { symbol: 'BTC', amount: 0.5 },
            { symbol: 'ETH', amount: 3.2 },
            { symbol: 'SOL', amount: 25 },
            { symbol: 'DOT', amount: 100 },
        ];

        let totalValue = 0;
        let totalChange = 0;

        const holdingsWithValue = holdings.map(h => {
            const livePrice = prices.get(h.symbol);
            const value = livePrice ? h.amount * livePrice.price : 0;
            const changeValue = livePrice ? value * (livePrice.priceChangePercent / 100) : 0;
            totalValue += value;
            totalChange += changeValue;
            return {
                ...h,
                price: livePrice?.price || 0,
                value,
                changePercent: livePrice?.priceChangePercent || 0,
            };
        });

        const changePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;

        return {
            totalValue,
            totalChange,
            changePercent,
            holdings: holdingsWithValue,
        };
    }, [prices]);

    // Get coins with live data for watchlist
    const watchlistCoins = useMemo(() => {
        return SUPPORTED_COINS.slice(0, 6).map(coin => {
            const livePrice = prices.get(coin.symbol);
            return {
                ...coin,
                price: livePrice?.price || 0,
                priceChangePercent: livePrice?.priceChangePercent || 0,
                direction: livePrice?.direction || 'neutral',
                sparklineData: generateSparklineData(livePrice?.priceChangePercent || 0),
            };
        });
    }, [prices]);

    const isPositive = portfolioData.changePercent >= 0;

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
                        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                        <p className="text-slate-400">Welcome back! Here's your portfolio overview.</p>
                    </div>
                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${connectionState.isConnected
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                        {connectionState.isConnected ? (
                            <><Wifi className="w-4 h-4" /><Zap className="w-3 h-3" /> Live</>
                        ) : (
                            <><WifiOff className="w-4 h-4" /> Connecting...</>
                        )}
                    </div>
                </motion.div>

                {/* Portfolio Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 mb-8"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Total Portfolio Value</p>
                            <motion.h2
                                key={portfolioData.totalValue}
                                initial={{ scale: 1.02 }}
                                animate={{ scale: 1 }}
                                className="text-4xl font-bold text-white mb-2"
                            >
                                {portfolioData.totalValue > 0 ? formatPrice(portfolioData.totalValue) : '--'}
                            </motion.h2>
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {formatPercent(portfolioData.changePercent)} (24h)
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/trade')}
                                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-white font-semibold transition-colors"
                            >
                                Trade Now
                            </button>
                            <button
                                onClick={() => navigate('/wallet')}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-colors"
                            >
                                Deposit
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Holdings & Watchlist Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* My Holdings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">My Holdings</h3>
                            <button
                                onClick={() => navigate('/portfolio')}
                                className="text-indigo-400 text-sm hover:text-indigo-300"
                            >
                                View All
                            </button>
                        </div>
                        <div className="space-y-4">
                            {portfolioData.holdings.map((holding) => {
                                const coin = SUPPORTED_COINS.find(c => c.symbol === holding.symbol);
                                const isPositive = holding.changePercent >= 0;
                                return (
                                    <div
                                        key={holding.symbol}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 transition-colors cursor-pointer"
                                        onClick={() => navigate('/trade')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                                                style={{ backgroundColor: `${coin?.color}20`, color: coin?.color }}
                                            >
                                                {coin?.icon}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{holding.symbol}</p>
                                                <p className="text-slate-500 text-sm">{holding.amount} {holding.symbol}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-white">
                                                {holding.value > 0 ? formatPrice(holding.value) : '--'}
                                            </p>
                                            <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatPercent(holding.changePercent)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Watchlist */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Watchlist</h3>
                            <button
                                onClick={() => navigate('/markets')}
                                className="text-indigo-400 text-sm hover:text-indigo-300"
                            >
                                View All
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {watchlistCoins.map((coin) => {
                                const isPositive = coin.priceChangePercent >= 0;
                                return (
                                    <motion.div
                                        key={coin.id}
                                        whileHover={{ scale: 1.01 }}
                                        onClick={() => navigate('/trade')}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${coin.direction === 'up' ? 'bg-green-500/5' :
                                                coin.direction === 'down' ? 'bg-red-500/5' : 'bg-slate-900/50'
                                            } hover:bg-white/5`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                                                style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                            >
                                                {coin.icon}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white text-sm">{coin.symbol}</p>
                                                <p className="text-slate-500 text-xs">{coin.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-8">
                                                <SparklineChart
                                                    data={coin.sparklineData}
                                                    color={isPositive ? '#10B981' : '#EF4444'}
                                                    height={32}
                                                />
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <p className={`font-medium text-sm ${coin.direction === 'up' ? 'text-green-400' :
                                                        coin.direction === 'down' ? 'text-red-400' : 'text-white'
                                                    }`}>
                                                    {coin.price > 0 ? formatPrice(coin.price) : '--'}
                                                </p>
                                                <p className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatPercent(coin.priceChangePercent)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>

                {/* Market Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-white">Market Overview</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-slate-900/30">
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">#</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Name</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Price</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">24h Change</th>
                                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Volume</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SUPPORTED_COINS.slice(0, 5).map((coin, index) => {
                                    const livePrice = prices.get(coin.symbol);
                                    const isPositive = (livePrice?.priceChangePercent || 0) >= 0;
                                    return (
                                        <tr
                                            key={coin.id}
                                            onClick={() => navigate('/trade')}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            <td className="py-4 px-4 text-slate-500 text-sm">{index + 1}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                                                        style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                                    >
                                                        {coin.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white text-sm">{coin.name}</p>
                                                        <p className="text-slate-500 text-xs">{coin.symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`font-medium ${livePrice?.direction === 'up' ? 'text-green-400' :
                                                        livePrice?.direction === 'down' ? 'text-red-400' : 'text-white'
                                                    }`}>
                                                    {livePrice ? formatPrice(livePrice.price) : '--'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {formatPercent(livePrice?.priceChangePercent || 0)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 hidden md:table-cell text-slate-400 text-sm">
                                                {livePrice ? `$${formatVolume(livePrice.quoteVolume)}` : '--'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
