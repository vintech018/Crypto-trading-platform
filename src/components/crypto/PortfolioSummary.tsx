import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface PortfolioSummaryProps {
    totalValue: number;
    pnl: number;
    pnlPercent: number;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
    totalValue,
    pnl,
    pnlPercent
}) => {
    const isPositive = pnl >= 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-cyan-600/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
        >
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Total Portfolio Value</p>
                        <p className="text-slate-500 text-xs">Updated just now</p>
                    </div>
                </div>

                <div className="mb-6">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl font-bold text-white tracking-tight"
                    >
                        {formatCurrency(totalValue)}
                    </motion.h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        <span className="font-semibold">
                            {isPositive ? '+' : ''}{formatCurrency(pnl)}
                        </span>
                        <span className="text-sm opacity-80">
                            ({isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </span>
                    </div>
                    <span className="text-slate-500 text-sm">All time P&L</span>
                </div>
            </div>
        </motion.div>
    );
};

export default PortfolioSummary;
