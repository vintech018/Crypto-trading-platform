'use client'

import { useMarketStore } from '@/state/marketStore'
import { useMemo } from 'react'

function fmtPrice(n: number) {
    if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    if (n >= 100) return n.toFixed(2)
    if (n >= 1) return n.toFixed(3)
    return n.toFixed(5)
}

function fmtQty(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K'
    return n.toFixed(3)
}

export function OrderBook() {
    const { bids, asks } = useMarketStore(s => s.orderBook)
    const prices = useMarketStore(s => s.prices)
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const midPrice = prices[activeSymbol]?.price

    const maxAskQty = useMemo(() => Math.max(...asks.map(a => a.qty), 0), [asks])
    const maxBidQty = useMemo(() => Math.max(...bids.map(b => b.qty), 0), [bids])
    const maxQty = Math.max(maxAskQty, maxBidQty, 0.001)

    const spread = asks.length && bids.length ? asks[0].price - bids[0].price : null
    const spreadPct = spread && bids.length ? (spread / bids[0].price) * 100 : null

    return (
        <div className="flex flex-col h-full text-[11px] font-mono">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-[11px] font-semibold text-white tracking-wide">Order Book</span>
            </div>

            {/* Column headers */}
            <div className="flex items-center px-3 py-1 text-[9px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <span className="flex-1">Price (USDT)</span>
                <span className="w-16 text-right">Size</span>
                <span className="w-16 text-right">Total</span>
            </div>

            {/* Asks (sell orders) — reversed so highest is at top */}
            <div className="flex-1 overflow-hidden flex flex-col-reverse">
                {asks.slice(0, 12).map((ask, i) => {
                    const fillPct = (ask.qty / maxQty) * 100
                    const cumTotal = asks.slice(0, i + 1).reduce((s, a) => s + a.qty, 0)
                    return (
                        <div
                            key={`ask-${ask.price}`}
                            className="flex items-center px-3 py-[2px] relative hover:bg-white/[0.02] group"
                        >
                            <div
                                className="absolute right-0 top-0 bottom-0 opacity-20 bg-red-500"
                                style={{ width: `${fillPct}%` }}
                            />
                            <span className="flex-1 text-red-400 relative z-10">{fmtPrice(ask.price)}</span>
                            <span className="w-16 text-right text-white/60 relative z-10">{fmtQty(ask.qty)}</span>
                            <span className="w-16 text-right text-white/30 relative z-10">{fmtQty(cumTotal)}</span>
                        </div>
                    )
                })}
            </div>

            {/* Spread */}
            <div className="flex items-center justify-between px-3 py-1 border-y border-white/[0.06] bg-white/[0.01]">
                <span className="text-white font-semibold">
                    {midPrice ? `$${fmtPrice(midPrice)}` : '---'}
                </span>
                {spreadPct != null && (
                    <span className="text-white/30 text-[9px]">
                        Spread: {spread!.toFixed(2)} ({spreadPct.toFixed(3)}%)
                    </span>
                )}
            </div>

            {/* Bids (buy orders) */}
            <div className="flex-1 overflow-hidden">
                {bids.slice(0, 12).map((bid, i) => {
                    const fillPct = (bid.qty / maxQty) * 100
                    const cumTotal = bids.slice(0, i + 1).reduce((s, b) => s + b.qty, 0)
                    return (
                        <div
                            key={`bid-${bid.price}`}
                            className="flex items-center px-3 py-[2px] relative hover:bg-white/[0.02]"
                        >
                            <div
                                className="absolute right-0 top-0 bottom-0 opacity-20 bg-emerald-500"
                                style={{ width: `${fillPct}%` }}
                            />
                            <span className="flex-1 text-emerald-400 relative z-10">{fmtPrice(bid.price)}</span>
                            <span className="w-16 text-right text-white/60 relative z-10">{fmtQty(bid.qty)}</span>
                            <span className="w-16 text-right text-white/30 relative z-10">{fmtQty(cumTotal)}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
