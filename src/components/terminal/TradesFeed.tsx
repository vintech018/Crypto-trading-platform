'use client'

import { useMarketStore } from '@/state/marketStore'

function timeAgo(ts: number) {
    const diff = Date.now() - ts
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    return `${Math.floor(diff / 60000)}m ago`
}

export function TradesFeed() {
    const trades = useMarketStore(s => s.recentTrades)

    return (
        <div className="flex flex-col h-full text-[11px] font-mono">
            <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-[11px] font-semibold text-white tracking-wide">Recent Trades</span>
            </div>

            {/* Column headers */}
            <div className="flex items-center px-3 py-1 text-[9px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <span className="flex-1">Price</span>
                <span className="w-16 text-right">Size</span>
                <span className="w-14 text-right">Time</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none">
                {trades.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-white/20 text-[10px]">
                        Connecting to trade stream…
                    </div>
                )}
                {trades.slice(0, 50).map(trade => {
                    const isBuy = !trade.isBuyerMaker
                    const isLarge = trade.qty * trade.price > 50000
                    return (
                        <div
                            key={trade.id}
                            className={`flex items-center px-3 py-[3px] hover:bg-white/[0.02] transition-colors
                ${isLarge ? 'bg-white/[0.015]' : ''}`}
                        >
                            <span className={`flex-1 font-semibold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                                ${trade.price.toFixed(2)}
                                {isLarge && <span className="ml-1 text-[8px] text-yellow-400 opacity-80">🐋</span>}
                            </span>
                            <span className="w-16 text-right text-white/60">
                                {trade.qty < 0.001 ? trade.qty.toFixed(5) : trade.qty.toFixed(3)}
                            </span>
                            <span className="w-14 text-right text-white/25">
                                {timeAgo(trade.time)}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
