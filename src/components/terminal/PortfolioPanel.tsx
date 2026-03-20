'use client'

import { useMarketStore } from '@/state/marketStore'
import { X } from 'lucide-react'
import { closePositionLines } from './PositionLines'

export function PortfolioPanel() {
    const equity = useMarketStore(s => s.equity)
    const buyingPower = useMarketStore(s => s.buyingPower)
    const marginUsed = useMarketStore(s => s.marginUsed)
    const positions = useMarketStore(s => s.positions)
    const prices = useMarketStore(s => s.prices)
    const closePosition = useMarketStore(s => s.closePosition)

    const INITIAL = 50000
    const totalUnrealizedPnl = positions.reduce((sum, pos) => {
        const current = prices[pos.symbol]?.price
        if (!current) return sum
        const pnl = pos.side === 'long'
            ? (current - pos.entryPrice) * pos.size * pos.leverage
            : (pos.entryPrice - current) * pos.size * pos.leverage
        return sum + pnl
    }, 0)

    const totalEquity = equity + totalUnrealizedPnl
    const totalReturn = ((totalEquity - INITIAL) / INITIAL) * 100

    const stats = [
        { label: 'Total Equity', value: `$${totalEquity.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, color: 'text-white' },
        { label: 'Buying Power', value: `$${buyingPower.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, color: 'text-cyan-400' },
        { label: 'Margin Used', value: `$${marginUsed.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, color: 'text-yellow-400' },
        { label: 'Unrealized P&L', value: `${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`, color: totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Total Return', value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400' },
    ]

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-[11px] font-semibold text-white tracking-wide">Portfolio</span>
            </div>

            {/* Stats */}
            <div className="px-3 py-2 grid grid-cols-2 gap-2 border-b border-white/[0.04]">
                {stats.map(s => (
                    <div key={s.label} className="bg-white/[0.02] rounded p-2">
                        <div className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">{s.label}</div>
                        <div className={`text-xs font-mono font-bold ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Open Positions */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="px-3 py-1.5">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">Open Positions ({positions.length})</span>
                </div>

                {positions.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[10px] text-white/20">No open positions</div>
                ) : (
                    positions.map(pos => {
                        const current = prices[pos.symbol]?.price
                        const pnl = current
                            ? pos.side === 'long'
                                ? (current - pos.entryPrice) * pos.size * pos.leverage
                                : (pos.entryPrice - current) * pos.size * pos.leverage
                            : 0
                        const pnlPct = (pnl / (pos.entryPrice * pos.size / pos.leverage)) * 100
                        const shortSym = pos.symbol.replace('USDT', '')

                        return (
                            <div key={pos.id} className="mx-3 mb-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-white">{shortSym}</span>
                                        <span className={`text-[8px] font-bold px-1 rounded ${pos.side === 'long' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                            {pos.side.toUpperCase()}
                                        </span>
                                        <span className="text-[8px] text-yellow-400 bg-yellow-400/10 px-1 rounded">{pos.leverage}×</span>
                                    </div>
                                    <button onClick={() => { const exitPx = prices[pos.symbol]?.price ?? pos.entryPrice; closePosition(pos.id); closePositionLines(exitPx) }} className="text-white/20 hover:text-white/60 transition-colors">
                                        <X size={11} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[9px]">
                                    <div>
                                        <div className="text-white/30">Entry</div>
                                        <div className="font-mono text-white/70">${pos.entryPrice.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-white/30">Current</div>
                                        <div className="font-mono text-white/70">{current ? `$${current.toFixed(2)}` : '---'}</div>
                                    </div>
                                    <div>
                                        <div className="text-white/30">P&L</div>
                                        <div className={`font-mono font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                            <span className="ml-0.5 text-[8px] opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
