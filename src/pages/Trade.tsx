import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Wifi, WifiOff, Zap, ArrowRightLeft } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useCrypto } from '../contexts/CryptoContext';
import { useCryptoPrice } from '../hooks/useCryptoPrices';
import { SUPPORTED_COINS } from '../types/crypto.types';
import RealTimeChart from '../components/RealTimeChart';

const Trade: React.FC = () => {
    const { prices, connectionState, formatPrice, formatPercent, formatVolume } = useCrypto();
    const [selectedSymbol, setSelectedSymbol] = useState('BTC');
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [showCoinSelector, setShowCoinSelector] = useState(false);

    const { price: livePrice, isFlashing, flashDirection, formattedPrice } = useCryptoPrice(selectedSymbol);

    const selectedCoin = useMemo(() =>
        SUPPORTED_COINS.find(c => c.symbol === selectedSymbol),
        [selectedSymbol]
    );

    const calculatedTotal = useMemo(() => {
        const qty = parseFloat(amount) || 0;
        return livePrice ? qty * livePrice.price : 0;
    }, [amount, livePrice]);

    const handleQuickPercent = (percent: number) => {
        // Simulated balance
        const balance = orderType === 'buy' ? 10000 : 1;
        if (orderType === 'buy' && livePrice) {
            const usdAmount = balance * (percent / 100);
            setAmount((usdAmount / livePrice.price).toFixed(6));
        } else {
            setAmount((balance * (percent / 100)).toFixed(6));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle order submission
        console.log(`${orderType.toUpperCase()} ${amount} ${selectedSymbol} at ${formattedPrice}`);
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
                        <h1 className="text-3xl font-bold text-white mb-2">Trade</h1>
                        <p className="text-slate-400">Buy and sell cryptocurrencies instantly.</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${connectionState.isConnected
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'
                        }`}>
                        {connectionState.isConnected ? (
                            <><Wifi className="w-4 h-4" /><Zap className="w-3 h-3" /> Live Prices</>
                        ) : (
                            <><WifiOff className="w-4 h-4" /> Connecting...</>
                        )}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Price Card & Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        {/* Price Display */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                {/* Coin Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCoinSelector(!showCoinSelector)}
                                        className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-xl hover:bg-slate-900/80 transition-colors"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                                            style={{ backgroundColor: `${selectedCoin?.color}20`, color: selectedCoin?.color }}
                                        >
                                            {selectedCoin?.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-white">{selectedCoin?.name}</p>
                                            <p className="text-slate-500 text-sm">{selectedSymbol}/USDT</p>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-slate-400 ml-2" />
                                    </button>

                                    <AnimatePresence>
                                        {showCoinSelector && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                            >
                                                {SUPPORTED_COINS.map((coin) => {
                                                    const coinPrice = prices.get(coin.symbol);
                                                    return (
                                                        <button
                                                            key={coin.id}
                                                            onClick={() => {
                                                                setSelectedSymbol(coin.symbol);
                                                                setShowCoinSelector(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${selectedSymbol === coin.symbol ? 'bg-indigo-500/10' : ''
                                                                }`}
                                                        >
                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                                                                style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                                            >
                                                                {coin.icon}
                                                            </div>
                                                            <div className="text-left flex-1">
                                                                <p className="font-medium text-white text-sm">{coin.symbol}</p>
                                                                <p className="text-slate-500 text-xs">{coin.name}</p>
                                                            </div>
                                                            <span className="text-slate-400 text-sm">
                                                                {coinPrice ? formatPrice(coinPrice.price) : '--'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Live Price */}
                                <div className="text-right">
                                    <motion.p
                                        key={livePrice?.price}
                                        initial={isFlashing ? { scale: 1.05 } : {}}
                                        animate={{ scale: 1 }}
                                        className={`text-3xl font-bold transition-colors ${flashDirection === 'up' ? 'text-green-400' :
                                            flashDirection === 'down' ? 'text-red-400' : 'text-white'
                                            }`}
                                    >
                                        {formattedPrice}
                                    </motion.p>
                                    <div className={`inline-flex items-center gap-1 mt-1 ${(livePrice?.priceChangePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {(livePrice?.priceChangePercent || 0) >= 0 ?
                                            <TrendingUp className="w-4 h-4" /> :
                                            <TrendingDown className="w-4 h-4" />
                                        }
                                        <span className="font-medium">{formatPercent(livePrice?.priceChangePercent || 0)}</span>
                                        <span className="text-slate-500 text-sm ml-1">24h</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-900/50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">24h High</p>
                                    <p className="text-white font-semibold">
                                        {livePrice ? formatPrice(livePrice.high24h) : '--'}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-900/50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">24h Low</p>
                                    <p className="text-white font-semibold">
                                        {livePrice ? formatPrice(livePrice.low24h) : '--'}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-900/50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">24h Volume</p>
                                    <p className="text-white font-semibold">
                                        {livePrice ? formatVolume(livePrice.volume) : '--'}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-900/50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">Quote Volume</p>
                                    <p className="text-white font-semibold">
                                        {livePrice ? `₹${formatVolume(livePrice.quoteVolume)}` : '--'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Trade Coins */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Quick Trade</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {SUPPORTED_COINS.slice(0, 5).map((coin) => {
                                    const coinPrice = prices.get(coin.symbol);
                                    const isPositive = (coinPrice?.priceChangePercent || 0) >= 0;
                                    const isSelected = selectedSymbol === coin.symbol;
                                    return (
                                        <motion.button
                                            key={coin.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedSymbol(coin.symbol)}
                                            className={`p-4 rounded-xl transition-all ${isSelected
                                                ? 'bg-indigo-500/20 border-2 border-indigo-500/50'
                                                : 'bg-slate-900/50 border border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs"
                                                    style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                                                >
                                                    {coin.icon}
                                                </div>
                                                <span className="text-white font-medium text-sm">{coin.symbol}</span>
                                            </div>
                                            <p className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatPercent(coinPrice?.priceChangePercent || 0)}
                                            </p>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Real-Time Chart with WebSocket kline streaming */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                            <RealTimeChart symbol={selectedSymbol} height={400} showVolume />
                        </div>
                    </motion.div>

                    {/* Order Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                    >
                        {/* Buy/Sell Toggle */}
                        <div className="flex bg-slate-900/50 rounded-xl p-1 mb-6">
                            <button
                                onClick={() => setOrderType('buy')}
                                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${orderType === 'buy'
                                    ? 'bg-green-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Buy
                            </button>
                            <button
                                onClick={() => setOrderType('sell')}
                                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${orderType === 'sell'
                                    ? 'bg-red-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Sell
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Price Display */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Market Price</label>
                                <div className="p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">1 {selectedSymbol} =</span>
                                        <span className={`font-bold text-lg ${flashDirection === 'up' ? 'text-green-400' :
                                            flashDirection === 'down' ? 'text-red-400' : 'text-white'
                                            }`}>
                                            {formattedPrice}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">
                                    Amount ({selectedSymbol})
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        step="any"
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-4 pr-20 text-white text-lg placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleQuickPercent(100)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/30"
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {/* Quick Percent Buttons */}
                            <div className="grid grid-cols-4 gap-2">
                                {[25, 50, 75, 100].map((percent) => (
                                    <button
                                        key={percent}
                                        type="button"
                                        onClick={() => handleQuickPercent(percent)}
                                        className="py-2 bg-slate-900/50 rounded-lg text-slate-400 text-sm font-medium hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        {percent}%
                                    </button>
                                ))}
                            </div>

                            {/* Total */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">Total (INR)</label>
                                <div className="p-4 bg-slate-900/50 rounded-xl flex items-center justify-between">
                                    <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                                    <span className="text-white text-lg font-semibold">
                                        ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={!amount || parseFloat(amount) <= 0}
                                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${orderType === 'buy'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500'
                                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500'
                                    }`}
                            >
                                {orderType === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
                            </motion.button>
                        </form>

                        {/* Balance Info */}
                        <div className="mt-6 p-4 bg-slate-900/30 rounded-xl">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Available INR</span>
                                <span className="text-white font-medium">₹10,00,000.00</span>
                            </div>
                            <div className="flex justify-between text-sm mt-2">
                                <span className="text-slate-500">Available {selectedSymbol}</span>
                                <span className="text-white font-medium">1.00000</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Trade;
