import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import SparklineChart from './SparklineChart';

interface CryptoCardProps {
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    sparkline: number[];
    icon: string;
    color: string;
    onClick?: () => void;
}

const CryptoCard: React.FC<CryptoCardProps> = ({
    name,
    symbol,
    price,
    change24h,
    sparkline,
    icon,
    color,
    onClick
}) => {
    const isPositive = change24h >= 0;

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: value < 1 ? 4 : 2,
            maximumFractionDigits: value < 1 ? 4 : 2
        }).format(value);
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-white/20 transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
                        style={{ backgroundColor: `${color}20`, color: color }}
                    >
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{name}</h3>
                        <p className="text-slate-500 text-sm">{symbol}</p>
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                </div>
            </div>

            <div className="h-16 mb-4">
                <SparklineChart data={sparkline} color={isPositive ? '#22c55e' : '#ef4444'} />
            </div>

            <div className="text-2xl font-bold text-white">
                {formatPrice(price)}
            </div>
        </motion.div>
    );
};

export default CryptoCard;
