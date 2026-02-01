import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import SparklineChart from './SparklineChart';
import type { Coin } from '../../lib/mockData';

interface AssetRowProps {
    coin: Coin;
    index?: number;
    onClick?: () => void;
}

const AssetRow: React.FC<AssetRowProps> = ({ coin, index = 0, onClick }) => {
    const isPositive = coin.change24h >= 0;

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: value < 1 ? 4 : 2,
            maximumFractionDigits: value < 1 ? 4 : 2
        }).format(value);
    };

    const formatCompact = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2
        }).format(value);
    };

    return (
        <motion.tr
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
        >
            <td className="py-4 pl-4">
                <span className="text-slate-500 text-sm">{index + 1}</span>
            </td>
            <td className="py-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${coin.color}20`, color: coin.color }}
                    >
                        {coin.icon}
                    </div>
                    <div>
                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {coin.name}
                        </p>
                        <p className="text-slate-500 text-sm">{coin.symbol}</p>
                    </div>
                </div>
            </td>
            <td className="py-4">
                <span className="text-white font-medium">{formatPrice(coin.price)}</span>
            </td>
            <td className="py-4">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%
                </div>
            </td>
            <td className="py-4 hidden lg:table-cell">
                <span className="text-slate-300">${formatCompact(coin.marketCap)}</span>
            </td>
            <td className="py-4 hidden xl:table-cell">
                <span className="text-slate-400">${formatCompact(coin.volume24h)}</span>
            </td>
            <td className="py-4 pr-4 w-32">
                <SparklineChart
                    data={coin.sparkline}
                    color={isPositive ? '#22c55e' : '#ef4444'}
                    width={100}
                    height={40}
                />
            </td>
        </motion.tr>
    );
};

export default AssetRow;
