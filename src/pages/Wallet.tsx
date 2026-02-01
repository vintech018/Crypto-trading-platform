import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet as WalletIcon, Copy, Check, X, Plus, Minus } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import TransactionList from '../components/crypto/TransactionList';
import { holdings, transactions, formatCurrency } from '../lib/mockData';

const Wallet: React.FC = () => {
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    const totalBalance = holdings.reduce((sum, h) => sum + h.value, 0);
    const usdBalance = 2500;

    const walletAddresses = [
        { coin: 'BTC', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', icon: '₿', color: '#F7931A' },
        { coin: 'ETH', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', icon: 'Ξ', color: '#627EEA' },
    ];

    const handleCopy = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Wallet</h1>
                    <p className="text-slate-400">Manage your deposits and withdrawals.</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-cyan-600/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <WalletIcon className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-slate-400">Total Balance</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{formatCurrency(totalBalance + usdBalance)}</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <p className="text-slate-400 mb-4">Crypto Holdings</p>
                        <p className="text-3xl font-bold text-white mb-2">{formatCurrency(totalBalance)}</p>
                        <p className="text-slate-500 text-sm">{holdings.length} assets</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <p className="text-slate-400 mb-4">USD Balance</p>
                        <p className="text-3xl font-bold text-white mb-2">{formatCurrency(usdBalance)}</p>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex gap-4 mb-8">
                    <button onClick={() => setShowDepositModal(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-semibold">
                        <Plus className="w-5 h-5" />Deposit
                    </button>
                    <button onClick={() => setShowWithdrawModal(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-slate-800/80 border border-white/10 rounded-xl text-white font-semibold">
                        <Minus className="w-5 h-5" />Withdraw
                    </button>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Your Assets</h2>
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl divide-y divide-white/5">
                        {holdings.map((h) => (
                            <div key={h.coinId} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                                        style={{ backgroundColor: `${h.color}20`, color: h.color }}>{h.icon}</div>
                                    <div><p className="font-semibold text-white">{h.coinName}</p><p className="text-slate-500 text-sm">{h.coinSymbol}</p></div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-white">{h.amount} {h.coinSymbol}</p>
                                    <p className="text-slate-400 text-sm">{formatCurrency(h.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <TransactionList transactions={transactions} />
            </div>

            <AnimatePresence>
                {showDepositModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowDepositModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-semibold text-white">Deposit</h2>
                                <button onClick={() => setShowDepositModal(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                {walletAddresses.map((w) => (
                                    <div key={w.coin} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: `${w.color}20`, color: w.color }}>{w.icon}</div>
                                        <div className="flex-1 min-w-0"><p className="text-white font-medium">{w.coin}</p><p className="text-slate-500 text-xs truncate">{w.address}</p></div>
                                        <button onClick={() => handleCopy(w.address)} className="p-2 text-slate-400 hover:text-white">
                                            {copiedAddress === w.address ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showWithdrawModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowWithdrawModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-semibold text-white">Withdraw</h2>
                                <button onClick={() => setShowWithdrawModal(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div><label className="block text-slate-400 text-sm mb-2">Asset</label>
                                    <select className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white">
                                        {holdings.map((h) => <option key={h.coinId} value={h.coinId}>{h.coinSymbol}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-slate-400 text-sm mb-2">Address</label>
                                    <input type="text" placeholder="Wallet address" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                                </div>
                                <div><label className="block text-slate-400 text-sm mb-2">Amount</label>
                                    <input type="number" placeholder="0.00" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                                </div>
                                <button className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl text-white font-semibold">Withdraw</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
};

export default Wallet;
