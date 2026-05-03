'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/apiClient'
import { useMarketStore } from '@/state/marketStore'
import { TrendingUp, TrendingDown, RefreshCw, Filter } from 'lucide-react'

interface TradeRecord {
    id: string
    coin: string
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    totalValue: number
    avgBuyPrice: number | null
    realisedPnL: number | null
    createdAt: string
}

function fmtPrice(n: number) {
    if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (n >= 1) return n.toFixed(4)
    return n.toFixed(8)
}

function fmtDateTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function TradeHistory() {
    const [trades, setTrades] = useState<TradeRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [coinFilter, setCoinFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState<'' | 'BUY' | 'SELL'>('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pages, setPages] = useState(1)
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const tradeSyncId = useMarketStore(s => s.tradeSyncId)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' })
            if (coinFilter) params.set('coin', coinFilter)
            if (typeFilter) params.set('type', typeFilter)

            const res = await api.get<{
                success: boolean
                data: { trades: TradeRecord[]; total: number; pages: number }
            }>(`/api/orders/trades?${params}`)

            setTrades(res.data?.trades ?? [])
            setTotal(res.data?.total ?? 0)
            setPages(res.data?.pages ?? 1)
        } catch {
            setTrades([])
        } finally {
            setLoading(false)
        }
    }, [page, coinFilter, typeFilter, tradeSyncId])

    useEffect(() => { load() }, [load])

    // Pre-fill coin from active symbol
    useEffect(() => {
        if (activeSymbol) {
            const coin = activeSymbol.replace('USDT', '')
            setCoinFilter(coin)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const totalRealisedPnL = trades.reduce((sum, t) => sum + (t.realisedPnL ?? 0), 0)

    return (
        <div className="flex flex-col h-full text-[11px] font-mono">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white tracking-wide">Trade History</span>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => { setCoinFilter(''); setTypeFilter(''); setPage(1) }}
                        className="text-[9px] text-white/20 hover:text-white/50 transition-colors"
                        title="Reset filters"
                    >
                        <Filter size={9} />
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="text-white/30 hover:text-white/60 transition-colors"
                    >
                        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="px-3 py-1.5 border-b border-white/[0.04] flex gap-2">
                <input
                    value={coinFilter}
                    onChange={e => { setCoinFilter(e.target.value.toUpperCase()); setPage(1) }}
                    placeholder="Coin"
                    maxLength={8}
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-0.5
                               text-[9px] text-white placeholder-white/20 outline-none
                               focus:border-white/20 uppercase"
                />
                <select
                    value={typeFilter}
                    onChange={e => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1) }}
                    className="bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5
                               text-[9px] text-white/60 outline-none focus:border-white/20"
                >
                    <option value="">All</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                </select>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 px-3 py-1 text-[9px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <span>Asset</span>
                <span className="text-right">Price</span>
                <span className="text-right">Qty</span>
                <span className="text-right">P/L</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {!loading && trades.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-white/20 text-[10px]">
                        No trades found
                    </div>
                )}

                {trades.map(t => {
                    const isBuy = t.type === 'BUY'
                    const hasPnl = t.realisedPnL !== null
                    const pnlPositive = (t.realisedPnL ?? 0) >= 0

                    return (
                        <div
                            key={t.id}
                            className="px-3 py-[5px] border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                        >
                            {/* Row 1: coin + type + datetime */}
                            <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-white font-semibold">{t.coin}</span>
                                    <span className={`flex items-center gap-0.5 text-[9px] px-1 rounded ${
                                        isBuy
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : 'bg-red-500/15 text-red-400'
                                    }`}>
                                        {isBuy
                                            ? <TrendingUp size={7} className="inline" />
                                            : <TrendingDown size={7} className="inline" />
                                        }
                                        {t.type}
                                    </span>
                                </div>
                                <span className="text-white/20 text-[9px]">{fmtDateTime(t.createdAt)}</span>
                            </div>

                            {/* Row 2: price, qty, pnl */}
                            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center">
                                <span className={isBuy ? 'text-emerald-400' : 'text-red-400'}>
                                    ${fmtPrice(t.price)}
                                </span>
                                <span className="text-white/60 text-right">
                                    {t.quantity < 0.001 ? t.quantity.toFixed(6) : t.quantity.toFixed(4)}
                                </span>
                                <span className="text-white/25 text-right">
                                    ${t.totalValue >= 1000
                                        ? (t.totalValue / 1000).toFixed(1) + 'k'
                                        : t.totalValue.toFixed(2)
                                    }
                                </span>
                                <span className={`text-right font-medium min-w-[52px] ${
                                    !hasPnl ? 'text-white/15'
                                    : pnlPositive ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}>
                                    {hasPnl
                                        ? `${pnlPositive ? '+' : ''}$${(t.realisedPnL!).toFixed(2)}`
                                        : '—'
                                    }
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer: pagination + P/L summary */}
            <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px]">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors"
                    >
                        ‹
                    </button>
                    <span className="text-white/25">{page}/{pages} · {total} trades</span>
                    <button
                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                        disabled={page === pages}
                        className="text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors"
                    >
                        ›
                    </button>
                </div>
                {trades.some(t => t.realisedPnL !== null) && (
                    <span className={`text-[9px] font-medium ${
                        totalRealisedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                        Page P/L: {totalRealisedPnL >= 0 ? '+' : ''}${totalRealisedPnL.toFixed(2)}
                    </span>
                )}
            </div>
        </div>
    )
}
