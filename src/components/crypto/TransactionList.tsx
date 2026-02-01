import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, ArrowUp, ArrowDown, Plus, Minus } from 'lucide-react';
import type { Transaction } from '../../lib/mockData';

interface TransactionListProps {
    transactions: Transaction[];
    limit?: number;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, limit }) => {
    const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

    const getIcon = (type: Transaction['type']) => {
        switch (type) {
            case 'buy':
                return <ArrowDown className="w-4 h-4" />;
            case 'sell':
                return <ArrowUp className="w-4 h-4" />;
            case 'send':
                return <ArrowUpRight className="w-4 h-4" />;
            case 'receive':
                return <ArrowDownLeft className="w-4 h-4" />;
            case 'deposit':
                return <Plus className="w-4 h-4" />;
            case 'withdraw':
                return <Minus className="w-4 h-4" />;
        }
    };

    const getIconColor = (type: Transaction['type']) => {
        switch (type) {
            case 'buy':
            case 'receive':
            case 'deposit':
                return 'bg-green-500/10 text-green-400';
            case 'sell':
            case 'send':
            case 'withdraw':
                return 'bg-red-500/10 text-red-400';
        }
    };

    const getLabel = (type: Transaction['type']) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            </div>

            <div className="divide-y divide-white/5">
                {displayTransactions.map((tx, index) => (
                    <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconColor(tx.type)}`}>
                                    {getIcon(tx.type)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">{getLabel(tx.type)}</span>
                                        <span className="text-slate-400">{tx.coinSymbol}</span>
                                    </div>
                                    <p className="text-slate-500 text-sm">{formatDate(tx.date)}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className={`font-medium ${tx.type === 'buy' || tx.type === 'receive' || tx.type === 'deposit'
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                    }`}>
                                    {tx.type === 'buy' || tx.type === 'receive' || tx.type === 'deposit' ? '+' : '-'}
                                    {tx.amount} {tx.coinSymbol}
                                </p>
                                <p className="text-slate-500 text-sm">{formatCurrency(tx.value)}</p>
                            </div>
                        </div>

                        {tx.status === 'pending' && (
                            <div className="mt-2 ml-14">
                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400">
                                    Pending
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {limit && transactions.length > limit && (
                <div className="p-4 border-t border-white/10">
                    <button className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                        View all transactions
                    </button>
                </div>
            )}
        </div>
    );
};

export default TransactionList;
