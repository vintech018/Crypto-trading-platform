import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp } from 'lucide-react';

interface OrderFormProps {
    coinSymbol: string;
    coinName: string;
    currentPrice: number;
    color: string;
    onSubmit?: (type: 'buy' | 'sell', amount: number, total: number) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({
    coinSymbol,
    coinName,
    currentPrice,
    color,
    onSubmit
}) => {
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [total, setTotal] = useState('');

    const handleAmountChange = (value: string) => {
        const numValue = parseFloat(value) || 0;
        setAmount(value);
        setTotal((numValue * currentPrice).toFixed(2));
    };

    const handleTotalChange = (value: string) => {
        const numValue = parseFloat(value) || 0;
        setTotal(value);
        setAmount((numValue / currentPrice).toFixed(8));
    };

    const handleQuickAmount = (percent: number) => {
        // Simulating a balance of $10,000
        const balance = 10000;
        const newTotal = (balance * percent).toFixed(2);
        handleTotalChange(newTotal);
    };

    const handleSubmit = () => {
        const numAmount = parseFloat(amount) || 0;
        const numTotal = parseFloat(total) || 0;
        if (numAmount > 0 && onSubmit) {
            onSubmit(orderType, numAmount, numTotal);
        }
    };

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            {/* Order type toggle */}
            <div className="flex gap-2 mb-6 bg-slate-900/50 rounded-xl p-1">
                <motion.button
                    onClick={() => setOrderType('buy')}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${orderType === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    whileTap={{ scale: 0.98 }}
                >
                    Buy {coinSymbol}
                </motion.button>
                <motion.button
                    onClick={() => setOrderType('sell')}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${orderType === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                    whileTap={{ scale: 0.98 }}
                >
                    Sell {coinSymbol}
                </motion.button>
            </div>

            {/* Current price */}
            <div className="mb-6 p-4 bg-slate-900/50 rounded-xl">
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Current Price</span>
                    <span className="text-white font-semibold">{formatPrice(currentPrice)}</span>
                </div>
            </div>

            {/* Amount input */}
            <div className="mb-4">
                <label className="block text-slate-400 text-sm mb-2">Amount</label>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 pr-16 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span style={{ color }} className="font-semibold">{coinSymbol}</span>
                    </div>
                </div>
            </div>

            {/* Swap icon */}
            <div className="flex justify-center mb-4">
                <div className="w-10 h-10 bg-slate-900/50 border border-white/10 rounded-full flex items-center justify-center text-slate-400">
                    <ArrowDownUp className="w-5 h-5" />
                </div>
            </div>

            {/* Total input */}
            <div className="mb-6">
                <label className="block text-slate-400 text-sm mb-2">Total</label>
                <div className="relative">
                    <input
                        type="number"
                        value={total}
                        onChange={(e) => handleTotalChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 pr-16 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-semibold">
                        USD
                    </span>
                </div>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 mb-6">
                {[0.25, 0.5, 0.75, 1].map((percent) => (
                    <button
                        key={percent}
                        onClick={() => handleQuickAmount(percent)}
                        className="flex-1 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm font-medium transition-all"
                    >
                        {percent * 100}%
                    </button>
                ))}
            </div>

            {/* Submit button */}
            <motion.button
                onClick={handleSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${orderType === 'buy'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500'
                    }`}
            >
                {orderType === 'buy' ? 'Buy' : 'Sell'} {coinName}
            </motion.button>

            {/* Info */}
            <p className="text-center text-slate-500 text-xs mt-4">
                Fee: 0.1% • Available balance: {formatPrice(10000)}
            </p>
        </div>
    );
};

export default OrderForm;
