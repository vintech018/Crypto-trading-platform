'use client';

import { motion } from 'framer-motion';
import { Play, Pause, Trash2, BarChart2, TrendingUp, TrendingDown, AlertCircle, Cpu, Wifi } from 'lucide-react';
import Link from 'next/link';
import type { Bot } from '@/lib/api';

interface BotCardProps {
  bot: Bot;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

function pnlColor(v: number) {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-white/40';
}

function formatPnl(v: number) {
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

export function BotCard({ bot, onStart, onStop, onDelete, loading }: BotCardProps) {
  const winRate = bot.tradeCount > 0 ? ((bot.winCount / bot.tradeCount) * 100).toFixed(1) : '—';
  const isActive = bot.status === 'active';
  const totalPnl = bot.pnl + bot.unrealizedPnl;
  const hasPosition = !!bot.position;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className={`glass rounded-2xl p-5 transition-all duration-300 group
        ${isActive ? 'border-emerald-500/20 shadow-[0_0_30px_rgba(34,197,94,0.06)]' : 'hover:border-white/10'}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={`relative w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-white/15'}`}>
            {isActive && (
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm leading-tight">{bot.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-white/30">{bot.pair}</span>
              <span className="text-white/10">·</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-white/25'}`}>
                {isActive ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
        </div>

        {/* Total P&L */}
        <div className="text-right">
          <p className={`text-base font-mono font-bold ${pnlColor(totalPnl)}`}>
            {formatPnl(totalPnl)}
          </p>
          {hasPosition && (
            <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5 flex items-center gap-1 justify-end">
              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Live position
            </p>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Trades</p>
          <p className="text-sm font-mono font-bold text-white">{bot.tradeCount}</p>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Win Rate</p>
          <p className="text-sm font-mono font-bold text-white">{winRate}{bot.tradeCount > 0 ? '%' : ''}</p>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Balance</p>
          <p className="text-sm font-mono font-bold text-white">${Math.round(bot.virtualBalance).toLocaleString()}</p>
        </div>
      </div>

      {/* Strategy summary */}
      <div className="mb-4 text-[11px] font-mono bg-white/[0.015] rounded-lg px-3 py-2 border border-white/[0.04] space-y-1">
        {bot.botClass === 'algo' ? (
           <div className="text-white/40 space-y-1 py-1">
             <div className="flex items-center gap-2 text-purple-400">
               <Cpu size={11} />
               <span className="font-bold">Managed Cloud AI</span>
             </div>
             <p className="text-[10px] pl-4 text-white/20">Hyperopt NFI Strategy Engine</p>
             <div className="text-white/25 mt-2 pt-1 border-t border-white/[0.04] flex items-center justify-between">
               <span className="flex items-center gap-1"><Wifi size={10} className="text-emerald-400" /> Webhook Connected</span>
             </div>
           </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-white/40 mb-1">
              {totalPnl >= 0 ? <TrendingUp size={11} className="text-emerald-500/50" /> : <TrendingDown size={11} className="text-red-400/50" />}
              <span>Logic Gate: [{bot.logic}]</span>
            </div>
            {bot.entryConditions.slice(0, 2).map((c, i) => (
              <div key={i} className="text-white/25 pl-4 flex items-center gap-2">
                <span className="w-1 h-1 bg-white/10 rounded-full"/>
                {c.type.toUpperCase()}{c.operator ? ` ${c.operator} ${c.value}` : ''}
              </div>
            ))}
            {bot.entryConditions.length > 2 && <div className="text-white/20 pl-4 text-[9px]">+ {bot.entryConditions.length - 2} more</div>}
            <div className="text-white/25 mt-2 pt-1 border-t border-white/[0.04] flex items-center justify-between">
              <span>TP {bot.exit.tp}% &nbsp;/&nbsp; SL {bot.exit.sl}%</span>
              {bot.exit.trailingEnabled && (
                <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase">
                  Trailing
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Open position alert */}
      {hasPosition && bot.position && (
        <div className="flex items-center gap-2 mb-4 text-[10px] bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
          <AlertCircle size={10} className="text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-300/70">
            Position open @ ${bot.position.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            &nbsp;· Unrealized {formatPnl(bot.unrealizedPnl)}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isActive ? (
          <button
            onClick={() => onStop(bot.id)}
            disabled={loading}
            id={`stop-bot-${bot.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white/60 bg-white/[0.03] border border-white/10 rounded-lg hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-40"
          >
            <Pause size={12} /> Stop
          </button>
        ) : (
          <button
            onClick={() => onStart(bot.id)}
            disabled={loading}
            id={`start-bot-${bot.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg hover:bg-emerald-500/[0.12] transition-all disabled:opacity-40"
          >
            <Play size={12} /> Start
          </button>
        )}

        <Link
          href={`/bots/${bot.id}`}
          id={`view-bot-${bot.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white/50 bg-white/[0.03] border border-white/10 rounded-lg hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <BarChart2 size={12} /> Details
        </Link>

        <button
          onClick={() => onDelete(bot.id)}
          disabled={loading}
          id={`delete-bot-${bot.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400/50 bg-red-500/[0.04] border border-red-500/10 rounded-lg hover:bg-red-500/[0.10] hover:text-red-400 transition-all disabled:opacity-40"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}
