'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, ApiResponse } from '@/lib/apiClient'
import { useMarketStore } from '@/state/marketStore'
import {
     RefreshCw, TrendingUp,
     Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

/** An active holding (spot position) from the backend portfolio */
interface Holding {
    coin: string
    quantity: number
    avgBuyPrice: number
    totalCost: number
    currentPrice: number
    currentValue: number
    unrealisedPnL: number
    pnlPercent: number
}

/** Portfolio response from GET /api/user/portfolio */
interface PortfolioData {
    walletBalance: number
    holdings: Holding[]
    totalHoldingsValue: number
    totalUnrealisedPnL: number
    totalPortfolioValue: number
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
    if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (n >= 1) return n.toFixed(4)
    return n.toFixed(8)
}

function fmtQty(n: number) {
    if (n >= 1) return n.toFixed(4)
    return n.toFixed(8)
}

function fmtPnL(n: number) {
    const sign = n >= 0 ? '+' : ''
    return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(n: number) {
    const sign = n >= 0 ? '+' : ''
    return `${sign}${n.toFixed(2)}%`
}

// ── Component ─────────────────────────────────────────────────────────────

export function OpenOrders() {
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [walletBalance, setWalletBalance] = useState<number>(0)
    const [totalValue, setTotalValue] = useState<number>(0)
    const [totalPnL, setTotalPnL] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [view, setView] = useState<'positions' | 'summary'>('positions')
    const [closingCoin, setClosingCoin] = useState<string | null>(null)
    const tradeSyncId = useMarketStore(s => s.tradeSyncId)
    const triggerTradeSync = useMarketStore(s => s.triggerTradeSync)

    const handleClosePosition = async (coin: string) => {
        setClosingCoin(coin)
        try {
            await api.post('/api/trade/close', { coin })
            triggerTradeSync()
        } catch (e) {
            console.error("Failed to close position", e)
        } finally {
            setClosingCoin(null)
        }
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get<ApiResponse<PortfolioData>>('/api/user/portfolio')
            const data = res.data
            if (data) {
                setHoldings(data.holdings ?? [])
                setWalletBalance(data.walletBalance ?? 0)
                setTotalValue(data.totalPortfolioValue ?? 0)
                setTotalPnL(data.totalUnrealisedPnL ?? 0)
            }
        } catch {
            // Not logged in or API error — show empty state
            setHoldings([])
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tradeSyncId])

    useEffect(() => { load() }, [load])

    // Auto-refresh every 15s for live prices
    useEffect(() => {
        const t = setInterval(load, 15_000)
        return () => clearInterval(t)
    }, [load])

    return (
        <div className="flex flex-col h-full text-[11px] font-mono">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white tracking-wide">Active Positions</span>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex bg-white/[0.04] rounded overflow-hidden border border-white/[0.06]">
                        {(['positions', 'summary'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-2 py-0.5 text-[9px] uppercase tracking-wider transition-all ${
                                    view === v
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/30 hover:text-white/60'
                                }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="text-white/30 hover:text-white/60 transition-colors"
                    >
                        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 px-3 py-1 text-[9px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <span>Asset</span>
                <span className="text-right">Qty / Value</span>
                <span className="text-right">Price</span>
                <span className="text-right">P/L</span>
            </div>

            {/* Holdings list */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
                {!loading && holdings.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 gap-2 text-white/20">
                        <Wallet size={16} />
                        <span className="text-[10px]">No open positions</span>
                        <span className="text-[9px] text-white/15">Buy an asset to see it here</span>
                    </div>
                )}

                {loading && holdings.length === 0 && (
                    <div className="flex items-center justify-center h-24">
                        <RefreshCw size={14} className="animate-spin text-white/15" />
                    </div>
                )}

                {holdings.map(h => {
                    const isProfitable = h.unrealisedPnL >= 0
                    const PnLIcon = isProfitable ? ArrowUpRight : ArrowDownRight

                    return (
                        <div
                            key={h.coin}
                            className="px-3 py-[6px] border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                        >
                            {/* Row 1: coin + direction indicator */}
                            <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-white font-semibold">{h.coin}</span>
                                    <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-emerald-500/15 text-emerald-400">
                                        <TrendingUp size={8} className="inline mr-0.5" />
                                        LONG
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                                        isProfitable ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        <PnLIcon size={10} />
                                        {fmtPct(h.pnlPercent)}
                                    </span>
                                    <button
                                        onClick={() => handleClosePosition(h.coin)}
                                        disabled={closingCoin === h.coin}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    >
                                        {closingCoin === h.coin ? '...' : 'EXIT'}
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: details */}
                            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center">
                                <div className="flex flex-col">
                                    <span className="text-white/60">{fmtQty(h.quantity)}</span>
                                    <span className="text-[9px] text-white/25">${h.currentValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-white/40 text-[9px]">avg</span>
                                    <span className="text-white/50">${fmtPrice(h.avgBuyPrice)}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-white/40 text-[9px]">now</span>
                                    <span className="text-white/70">${fmtPrice(h.currentPrice)}</span>
                                </div>
                                <span className={`text-right font-semibold min-w-[60px] ${
                                    isProfitable ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {fmtPnL(h.unrealisedPnL)}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Summary footer */}
            {(holdings.length > 0 || walletBalance > 0) && (
                <div className="px-3 py-1.5 border-t border-white/[0.06] space-y-0.5">
                    <div className="flex items-center justify-between text-[9px]">
                        <span className="text-white/25">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
                        <span className={`font-semibold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            Unrealized: {fmtPnL(totalPnL)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                        <span className="text-white/25">
                            Cash: ${walletBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-white/40">
                            Total: ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
