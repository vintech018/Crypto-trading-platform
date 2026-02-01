import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import PortfolioSummary from '../components/crypto/PortfolioSummary';
import AllocationChart from '../components/crypto/AllocationChart';
import PriceChart from '../components/crypto/PriceChart';
import { holdings, getPortfolioTotal, btcPriceHistory } from '../lib/mockData';

const Portfolio: React.FC = () => {
    const portfolio = getPortfolioTotal();

    const allocationData = holdings.map((h) => ({
        name: h.coinName,
        value: h.value,
        color: h.color,
    }));

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
                    <p className="text-slate-400">Track your holdings and performance.</p>
                </motion.div>

                {/* Portfolio Summary */}
                <div className="mb-8">
                    <PortfolioSummary
                        totalValue={portfolio.value}
                        pnl={portfolio.pnl}
                        pnlPercent={portfolio.pnlPercent}
                    />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Allocation Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <AllocationChart data={allocationData} size={200} />
                    </motion.div>

                    {/* Performance Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full">
                            <h3 className="text-lg font-semibold text-white mb-4">Portfolio Performance</h3>
                            <PriceChart data={btcPriceHistory} color="#818cf8" height={200} />
                        </div>
                    </motion.div>
                </div>

                {/* Holdings Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-xl font-semibold text-white mb-4">Your Holdings</h2>
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 bg-slate-900/30">
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium text-sm">Asset</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium text-sm">Amount</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium text-sm">Avg. Buy Price</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium text-sm">Current Price</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium text-sm">Value</th>
                                        <th className="text-left py-4 px-4 text-slate-400 font-medium text-sm">P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.map((holding, index) => (
                                        <motion.tr
                                            key={holding.coinId}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.05 }}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                                                        style={{ backgroundColor: `${holding.color}20`, color: holding.color }}
                                                    >
                                                        {holding.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{holding.coinName}</p>
                                                        <p className="text-slate-500 text-sm">{holding.coinSymbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-white font-medium">
                                                    {holding.amount.toLocaleString()} {holding.coinSymbol}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-slate-300">{formatCurrency(holding.avgBuyPrice)}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-white">{formatCurrency(holding.currentPrice)}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-white font-semibold">{formatCurrency(holding.value)}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${holding.pnl >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                            }`}
                                                    >
                                                        {holding.pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                        {holding.pnl >= 0 ? '+' : ''}
                                                        {formatCurrency(holding.pnl)}
                                                    </div>
                                                    <span className={`text-sm ${holding.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ({holding.pnlPercent >= 0 ? '+' : ''}
                                                        {holding.pnlPercent.toFixed(2)}%)
                                                    </span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default Portfolio;
