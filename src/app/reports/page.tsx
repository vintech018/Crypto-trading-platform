'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, FileSpreadsheet, FileText, TrendingUp, TrendingDown,
    BarChart3, Calendar, Filter, Loader2, Download, ChevronDown,
    AlertCircle, CheckCircle, RefreshCw, Activity
} from 'lucide-react'
import { api, auth, ApiResponse, apiFetchBlob } from '@/lib/apiClient'

// ── Types ──────────────────────────────────────────────────────────────────

interface Trade {
    id:          string
    coin:        string
    type:        'BUY' | 'SELL'
    quantity:    number
    price:       number
    totalValue:  number
    avgBuyPrice: number | null
    realisedPnL: number | null
    createdAt:   string
}

interface Summary {
    totalTrades: number
    buyCount:    number
    sellCount:   number
    netPnL:      number
    winRate:     number
    bestTrade:   { coin: string; pnl: number; price: number; createdAt: string } | null
    worstTrade:  { coin: string; pnl: number; price: number; createdAt: string } | null
}

interface Pagination {
    total: number
    page:  number
    limit: number
    pages: number
}

const COINS = ['', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT']

function today()        { return new Date().toISOString().slice(0, 10) }
function thirtyDaysAgo(){ const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }

function fmt(n: number | null | undefined, decimals = 2) {
    if (n == null) return '—'
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtDate(s: string) {
    return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Summary stat card ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon }: {
    label: string; value: string; sub?: string; color: string; icon: React.ElementType
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y:  0 }}
            className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 overflow-hidden group"
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                 style={{ background: `radial-gradient(ellipse at 50% 0%, ${color} 0%, transparent 70%)` }} />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-white/35 uppercase tracking-widest font-medium">{label}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04]">
                        <Icon size={13} className="text-white/40" />
                    </div>
                </div>
                <div className="text-xl font-mono font-bold text-white">{value}</div>
                {sub && <div className="text-[10px] text-white/30 mt-1">{sub}</div>}
            </div>
        </motion.div>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const [trades,     setTrades]     = useState<Trade[]>([])
    const [summary,    setSummary]    = useState<Summary | null>(null)
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading,    setLoading]    = useState(true)
    const [summaryLoading, setSummaryLoading] = useState(true)
    const [error,      setError]      = useState<string | null>(null)

    // Filters
    const [startDate, setStartDate] = useState(thirtyDaysAgo())
    const [endDate,   setEndDate]   = useState(today())
    const [coin,      setCoin]      = useState('')
    const [page,      setPage]      = useState(1)

    // Export status
    const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [exportFmt,    setExportFmt]    = useState<'excel' | 'pdf' | null>(null)
    const [exportError,  setExportError]  = useState<string | null>(null)

    // ── Redirect if not logged in ─────────────────────────────────────────
    useEffect(() => {
        if (typeof window !== 'undefined' && !auth.isLoggedIn()) {
            window.location.href = '/login?from=%2Freports'
        }
    }, [])

    // ── Fetch data ────────────────────────────────────────────────────────
    const buildParams = useCallback(() => {
        const p = new URLSearchParams()
        if (startDate) p.set('startDate', startDate)
        if (endDate)   p.set('endDate',   endDate)
        if (coin)      p.set('coin',      coin)
        return p
    }, [startDate, endDate, coin])

    const fetchHistory = useCallback(async (p = 1) => {
        setLoading(true)
        setError(null)
        try {
            const params = buildParams()
            params.set('page',  String(p))
            params.set('limit', '50')
            const res = await api.get<ApiResponse<{ trades: Trade[]; pagination: Pagination }>>(
                `/api/trade/history?${params}`
            )
            setTrades(res.data?.trades ?? [])
            setPagination(res.data?.pagination ?? null)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load trade history')
        } finally {
            setLoading(false)
        }
    }, [buildParams])

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true)
        try {
            const params = buildParams()
            const res = await api.get<ApiResponse<Summary>>(`/api/trade/summary?${params}`)
            setSummary(res.data ?? null)
        } catch {
            // summary failing shouldn't block the whole page
        } finally {
            setSummaryLoading(false)
        }
    }, [buildParams])

    useEffect(() => {
        setPage(1)
        fetchHistory(1)
        fetchSummary()
    }, [startDate, endDate, coin]) // eslint-disable-line react-hooks/exhaustive-deps

    function handlePageChange(newPage: number) {
        setPage(newPage)
        fetchHistory(newPage)
    }

    // ── Export handler ────────────────────────────────────────────────────
    async function handleExport(format: 'excel' | 'pdf') {
        setExportStatus('loading')
        setExportFmt(format)
        setExportError(null)
        try {
            const params = buildParams()
            const res = await apiFetchBlob(`/api/reports/export/${format}?${params}`)

            const disposition = res.headers.get('Content-Disposition') ?? ''
            const match = disposition.match(/filename="([^"]+)"/)
            const filename = match?.[1] ?? `report.${format === 'excel' ? 'xlsx' : 'pdf'}`
            const blob = await res.blob()
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href     = url
            a.download = filename
            a.click()
            URL.revokeObjectURL(url)
            setExportStatus('success')
            setTimeout(() => setExportStatus('idle'), 3000)
        } catch (e: unknown) {
            setExportError(e instanceof Error ? e.message : 'Export failed')
            setExportStatus('error')
            setTimeout(() => { setExportStatus('idle'); setExportError(null) }, 5000)
        }
    }

    const pnlColor = (v: number | null) =>
        v == null ? 'text-white/40' : v >= 0 ? 'text-emerald-400' : 'text-red-400'

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                html, body { overflow-y: auto; }
                .reports-bg {
                    background-color: #000;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px);
                    background-size: 48px 48px;
                    min-height: 100vh;
                }
                .table-row:hover td { background: rgba(255,255,255,0.025); }
                .scrollbar-thin::-webkit-scrollbar { height: 4px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}} />

            <div className="reports-bg" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

                    {/* ── Header ─────────────────────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <Link href="/hub" className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                                <ArrowLeft size={12} /> Hub
                            </Link>
                            <div className="w-px h-4 bg-white/10" />
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <BarChart3 size={20} className="text-white/50" />
                                    Trade Reports
                                </h1>
                                <p className="text-[11px] text-white/30 mt-0.5">Complete trading history · Real-time from database</p>
                            </div>
                        </div>

                        {/* Export buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                id="btn-export-excel"
                                onClick={() => handleExport('excel')}
                                disabled={exportStatus === 'loading'}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold border
                                           bg-emerald-500/10 border-emerald-500/20 text-emerald-400
                                           hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all
                                           disabled:opacity-40 disabled:cursor-wait"
                            >
                                {exportStatus === 'loading' && exportFmt === 'excel'
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : <FileSpreadsheet size={12} />}
                                Excel
                            </button>
                            <button
                                id="btn-export-pdf"
                                onClick={() => handleExport('pdf')}
                                disabled={exportStatus === 'loading'}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold border
                                           bg-red-500/10 border-red-500/20 text-red-400
                                           hover:bg-red-500/20 hover:border-red-500/40 transition-all
                                           disabled:opacity-40 disabled:cursor-wait"
                            >
                                {exportStatus === 'loading' && exportFmt === 'pdf'
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : <FileText size={12} />}
                                PDF
                            </button>
                        </div>
                    </motion.div>

                    {/* Export status toast */}
                    <AnimatePresence>
                        {exportStatus === 'success' && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mb-4 flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-2.5">
                                <CheckCircle size={13} /> Report downloaded successfully
                            </motion.div>
                        )}
                        {exportStatus === 'error' && exportError && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mb-4 flex items-center gap-2 text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                                <AlertCircle size={13} /> {exportError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Summary Cards ───────────────────────────────── */}
                    {!summaryLoading && summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                            <StatCard label="Total Trades"  value={String(summary.totalTrades)} sub={`${summary.buyCount} buy · ${summary.sellCount} sell`} color="rgba(255,255,255,0.05)" icon={Activity} />
                            <StatCard label="Net P/L"       value={`${summary.netPnL >= 0 ? '+' : ''}$${fmt(summary.netPnL)}`} color={summary.netPnL >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'} icon={summary.netPnL >= 0 ? TrendingUp : TrendingDown} />
                            <StatCard label="Win Rate"      value={`${summary.winRate}%`}  sub={`${summary.sellCount} sells analysed`} color="rgba(99,102,241,0.12)" icon={BarChart3} />
                            <StatCard label="Best Trade"    value={summary.bestTrade  ? `+$${fmt(summary.bestTrade.pnl)}`  : '—'} sub={summary.bestTrade?.coin  ?? undefined} color="rgba(16,185,129,0.1)" icon={TrendingUp} />
                            <StatCard label="Worst Trade"   value={summary.worstTrade ? `$${fmt(summary.worstTrade.pnl)}` : '—'} sub={summary.worstTrade?.coin ?? undefined} color="rgba(239,68,68,0.1)"   icon={TrendingDown} />
                        </div>
                    )}
                    {summaryLoading && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 animate-pulse">
                                    <div className="h-2 w-16 bg-white/10 rounded mb-4" />
                                    <div className="h-5 w-24 bg-white/10 rounded" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Filters ─────────────────────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="flex flex-wrap items-end gap-3 mb-5">
                        <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Calendar size={8} /> From
                            </div>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                   className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[11px] text-white/80 outline-none focus:border-white/20 [color-scheme:dark]" />
                        </div>
                        <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Calendar size={8} /> To
                            </div>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                   className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[11px] text-white/80 outline-none focus:border-white/20 [color-scheme:dark]" />
                        </div>
                        <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Filter size={8} /> Asset
                            </div>
                            <div className="relative">
                                <select value={coin} onChange={e => setCoin(e.target.value)}
                                        className="appearance-none bg-white/[0.04] border border-white/[0.07] rounded-lg pl-3 pr-7 py-1.5 text-[11px] text-white/80 outline-none focus:border-white/20">
                                    {COINS.map(c => <option key={c} value={c}>{c || 'All assets'}</option>)}
                                </select>
                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                            </div>
                        </div>
                        <button onClick={() => { fetchHistory(page); fetchSummary() }}
                                className="flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[11px] text-white/50 hover:text-white/80 border border-white/[0.07] hover:border-white/20 transition-all bg-white/[0.03]">
                            <RefreshCw size={11} /> Refresh
                        </button>
                        {pagination && (
                            <div className="ml-auto text-[10px] text-white/25 font-mono">
                                {pagination.total} trade{pagination.total !== 1 ? 's' : ''}
                            </div>
                        )}
                    </motion.div>

                    {/* ── Trade History Table ──────────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                className="rounded-2xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">

                        {/* Table header */}
                        <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2">
                            <Activity size={12} className="text-white/30" />
                            <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Trade History</span>
                            <span className="ml-auto text-[9px] text-white/20 font-mono">Source: MongoDB · Real-time</span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 size={22} className="animate-spin text-white/20" />
                                <span className="text-[11px] text-white/25 font-mono">Fetching from database…</span>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <AlertCircle size={22} className="text-red-400/60" />
                                <span className="text-[12px] text-red-400/80">{error}</span>
                                <button onClick={() => fetchHistory(page)}
                                        className="text-[10px] text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1 transition-colors">
                                    Retry
                                </button>
                            </div>
                        ) : trades.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <BarChart3 size={28} className="text-white/10" />
                                <span className="text-[12px] text-white/25">No trades found for this period.</span>
                                <span className="text-[10px] text-white/15">Execute a trade in the Terminal to see it here.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="border-b border-white/[0.05]">
                                            {['Time', 'Asset', 'Type', 'Quantity', 'Price', 'Total Value', 'Avg Buy Price', 'P/L'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-left text-[9px] text-white/25 uppercase tracking-widest font-semibold whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map((t, i) => (
                                            <motion.tr key={t.id}
                                                       initial={{ opacity: 0 }}
                                                       animate={{ opacity: 1 }}
                                                       transition={{ delay: i * 0.015 }}
                                                       className="table-row border-b border-white/[0.03] last:border-0">
                                                <td className="px-4 py-2.5 text-white/30 font-mono whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                                                <td className="px-4 py-2.5 font-bold text-white">{t.coin}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest
                                                        ${t.type === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-white/70">{t.quantity.toFixed(6)}</td>
                                                <td className="px-4 py-2.5 font-mono text-white/70">${fmt(t.price)}</td>
                                                <td className="px-4 py-2.5 font-mono text-white/70">${fmt(t.totalValue)}</td>
                                                <td className="px-4 py-2.5 font-mono text-white/40">
                                                    {t.avgBuyPrice != null ? `$${fmt(t.avgBuyPrice)}` : '—'}
                                                </td>
                                                <td className={`px-4 py-2.5 font-mono font-semibold ${pnlColor(t.realisedPnL)}`}>
                                                    {t.realisedPnL != null
                                                        ? `${t.realisedPnL >= 0 ? '+' : ''}$${fmt(t.realisedPnL)}`
                                                        : <span className="text-white/15">—</span>}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.pages > 1 && (
                            <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
                                <span className="text-[10px] text-white/25">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button disabled={pagination.page <= 1}
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            className="px-3 py-1 rounded-lg text-[10px] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                                        Prev
                                    </button>
                                    <button disabled={pagination.page >= pagination.pages}
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            className="px-3 py-1 rounded-lg text-[10px] border border-white/[0.07] text-white/40 hover:text-white/70 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* ── Export Section ────────────────────────────────── */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Download size={13} className="text-white/40" />
                            <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Export Professional Reports</span>
                        </div>
                        <p className="text-[11px] text-white/30 mb-5">
                            Downloads use the active date range &amp; asset filter above. Reports include trade history,
                            portfolio positions, ledger entries, and P/L statements.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button id="export-excel-bottom"
                                    onClick={() => handleExport('excel')}
                                    disabled={exportStatus === 'loading'}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold border
                                               bg-emerald-500/10 border-emerald-500/20 text-emerald-400
                                               hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all
                                               disabled:opacity-40 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                <FileSpreadsheet size={14} />
                                Download Excel (.xlsx)
                            </button>
                            <button id="export-pdf-bottom"
                                    onClick={() => handleExport('pdf')}
                                    disabled={exportStatus === 'loading'}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold border
                                               bg-red-500/10 border-red-500/20 text-red-400
                                               hover:bg-red-500/20 hover:border-red-500/40 transition-all
                                               disabled:opacity-40 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                                <FileText size={14} />
                                Download PDF
                            </button>
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-[10px] text-white/10">
                        SOLIDUS · Trade Reporting · All data sourced from MongoDB · Not financial advice
                    </div>
                </div>
            </div>
        </>
    )
}
