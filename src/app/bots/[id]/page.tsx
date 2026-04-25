'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, Zap, Activity, TrendingUp, TrendingDown,
  Wallet, BarChart2, History, Target, Shield, Cpu, Wifi
} from 'lucide-react';
import { api, type Bot } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { EquityChart } from '@/components/bot/EquityChart';

function pnlColor(v: number) {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-white/40';
}

function fmt(v: number) {
  return `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(2)}`;
}

export default function BotDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [bot, setBot]     = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBot(id).then(setBot).catch(() => {});

    const socket = getSocket();
    socket.on('bot:update', (updated: Bot) => {
      if (updated.id === id) setBot(updated);
    });
    return () => { socket.off('bot:update'); };
  }, [id]);

  async function handleStart() {
    setLoading(true);
    try { const b = await api.startBot(id); setBot(b); } finally { setLoading(false); }
  }

  async function handleStop() {
    setLoading(true);
    try { const b = await api.stopBot(id); setBot(b); } finally { setLoading(false); }
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
      </div>
    );
  }

  const winRate   = bot.tradeCount > 0 ? ((bot.winCount / bot.tradeCount) * 100).toFixed(1) : null;
  const totalPnl  = bot.pnl + bot.unrealizedPnl;
  const isActive  = bot.status === 'active';

  return (
    <div className="min-h-screen bg-black bg-grid-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,197,94,0.04),transparent)] pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/bots" className="flex items-center gap-1.5 text-white/30 hover:text-white transition-colors text-sm">
              <ArrowLeft size={14} /> All Bots
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-400" />
              <span className="font-display font-bold text-white text-sm">{bot.name}</span>
              <span className="text-[10px] font-mono text-white/20">{bot.pair}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isActive ? (
              <button
                onClick={handleStop}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/60 glass border-white/10 rounded-xl hover:text-white transition-all"
              >
                <Pause size={14} /> Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl hover:bg-emerald-500/[0.15] transition-all"
              >
                <Play size={14} /> Start Bot
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Status header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
            isActive ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/[0.03] border-white/10 text-white/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
            {isActive ? 'Running' : 'Stopped'}
          </div>

          {bot.position && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400">
              <Activity size={11} />
              Position open @ ${bot.position.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          )}
        </motion.div>

        {/* KPI cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            {
              icon: TrendingUp,
              label: 'Total P&L',
              value: fmt(totalPnl),
              accent: totalPnl >= 0 ? 'emerald' : 'red',
            },
            {
              icon: Wallet,
              label: 'Virtual Balance',
              value: `$${Math.round(bot.virtualBalance).toLocaleString()}`,
              accent: 'white',
            },
            {
              icon: BarChart2,
              label: 'Trades',
              value: bot.tradeCount.toString(),
              accent: 'white',
            },
            {
              icon: Activity,
              label: 'Win Rate',
              value: winRate ? `${winRate}%` : '—',
              accent: winRate && Number(winRate) >= 50 ? 'emerald' : 'red',
            },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="glass rounded-2xl p-5">
              <Icon size={14} className={`text-${accent}-400 mb-3 opacity-70`} />
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-xl font-mono font-bold ${pnlColor(totalPnl) && label === 'Total P&L' ? pnlColor(totalPnl) : 'text-white'}`}>
                {value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Strategy + Open position row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Strategy */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-bold mb-4">
              {bot.botClass === 'algo' ? 'Managed Cloud AI' : `Strategy (${bot.logic})`}
            </h3>
            
            {bot.botClass === 'algo' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                   <div className="flex items-center gap-2"><Target size={11} className="text-white/20" /><span className="text-xs text-white/35">Pair & Size</span></div>
                   <span className="text-xs font-mono text-white">{bot.pair} / ${bot.amount}</span>
                </div>
                <div className="py-3 px-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu size={12} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-400">NostalgiaForInfinityX</span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    This instance is running an ensemble of 40+ dynamic technical indicators. Entry/Exit conditions and Trailing Stops are managed autonomously by the Python Microservice.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400/80 py-1">
                  <Wifi size={12} className="animate-pulse" />
                  <span className="font-mono">Webhook Active</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                   <div className="flex items-center gap-2"><Target size={11} className="text-white/20" /><span className="text-xs text-white/35">Pair & Size</span></div>
                   <span className="text-xs font-mono text-white">{bot.pair} / ${bot.amount}</span>
                </div>
                <div className="py-2 border-b border-white/[0.04]">
                   <div className="flex items-center gap-2 mb-2"><Activity size={11} className="text-white/20" /><span className="text-xs text-white/35">Entry Conditions</span></div>
                   <div className="space-y-1 pl-5">
                      {bot.entryConditions.map((c, i) => (
                         <div key={i} className="text-[11px] font-mono text-emerald-400/80 bg-emerald-500/5 px-2 py-1 rounded w-fit">
                            {c.type.toUpperCase().replace('_', ' ')}{c.operator ? ` ${c.operator} ${c.value}` : ''}
                         </div>
                      ))}
                   </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                   <div className="flex items-center gap-2"><Target size={11} className="text-white/20" /><span className="text-xs text-white/35">Take Profit</span></div>
                   <span className="text-xs font-mono text-emerald-400">+{bot.exit.tp}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                   <div className="flex items-center gap-2"><Shield size={11} className="text-white/20" /><span className="text-xs text-white/35">Stop Loss</span></div>
                   <span className="text-xs font-mono text-red-400">-{bot.exit.sl}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                   <div className="flex items-center gap-2"><Zap size={11} className="text-white/20" /><span className="text-xs text-white/35">Max Daily</span></div>
                   <span className="text-xs font-mono text-white/60">{bot.exit.maxTradesPerDay === 0 ? 'Unlimited' : bot.exit.maxTradesPerDay}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Open position */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`glass rounded-2xl p-5 ${bot.position ? 'border-emerald-500/15' : ''}`}
          >
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-bold mb-4">Open Position</h3>
            {bot.position ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/35">Entry Price</span>
                  <span className="text-sm font-mono text-white">${bot.position.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/35">Quantity</span>
                  <span className="text-sm font-mono text-white">{bot.position.qty.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/35">Unrealized P&L</span>
                  <span className={`text-sm font-mono font-bold ${pnlColor(bot.unrealizedPnl)}`}>
                    {fmt(bot.unrealizedPnl)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/35">Opened At</span>
                  <span className="text-xs font-mono text-white/50">
                    {new Date(bot.position.openedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2 text-center">
                    <p className="text-white/30 mb-0.5">TP at</p>
                    <p className="text-emerald-400 font-mono font-bold">
                      ${(bot.position.entryPrice * (1 + bot.exit.tp / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 text-center">
                    <p className="text-white/30 mb-0.5">SL at</p>
                    <p className="text-red-400 font-mono font-bold">
                      ${(bot.position.entryPrice * (1 - bot.exit.sl / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
                  <Activity size={16} className="text-white/15" />
                </div>
                <p className="text-sm text-white/25">No open position</p>
                <p className="text-xs text-white/15 mt-1">
                  {isActive ? 'Waiting for entry condition…' : 'Start the bot to open a position'}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Equity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={14} className="text-white/30" />
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-bold">Equity Curve</h3>
            {bot.tradeCount > 0 && (
              <span className="ml-auto text-[10px] text-white/20 font-mono">{bot.tradeCount} trade{bot.tradeCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <EquityChart trades={bot.trades} startBalance={10000} />
        </motion.div>

        {/* Trade History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.05]">
            <History size={14} className="text-white/30" />
            <h3 className="text-[11px] text-white/30 uppercase tracking-widest font-bold">Trade History</h3>
            {bot.trades.length > 0 && (
              <span className="ml-auto text-[10px] text-white/20">{bot.trades.length} records</span>
            )}
          </div>

          {bot.trades.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-white/20 text-sm">
              No closed trades yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Entry Price', 'Exit Price', 'P&L', 'Return', 'Reason', 'Duration', 'Closed At'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] text-white/20 uppercase tracking-wider font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bot.trades.map((t, i) => {
                    const dur = Math.round((new Date(t.closedAt).getTime() - new Date(t.openedAt).getTime()) / 1000);
                    const durStr = dur < 60 ? `${dur}s` : dur < 3600 ? `${Math.floor(dur/60)}m` : `${Math.floor(dur/3600)}h`;
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-white/70">${t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5 font-mono text-white/70">${t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className={`px-5 py-3.5 font-mono font-bold ${pnlColor(t.pnl)}`}>{fmt(t.pnl)}</td>
                        <td className={`px-5 py-3.5 font-mono ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            t.closeReason === 'take_profit'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.closeReason === 'take_profit' ? 'TP' : 'SL'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-white/30">{durStr}</td>
                        <td className="px-5 py-3.5 font-mono text-white/25">{new Date(t.closedAt).toLocaleTimeString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
