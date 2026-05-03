'use client'

import { useState } from 'react'
import { apiFetchBlob } from '@/lib/apiClient'
import { FileSpreadsheet, FileText, Download, Calendar, Filter, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT']

type Format = 'excel' | 'pdf'
type Status = 'idle' | 'loading' | 'success' | 'error'

function today() {
    return new Date().toISOString().slice(0, 10)
}
function thirtyDaysAgo() {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
}

export function ExportReports() {
    const [startDate, setStartDate] = useState(thirtyDaysAgo())
    const [endDate,   setEndDate]   = useState(today())
    const [asset,     setAsset]     = useState('')
    const [status,    setStatus]    = useState<Status>('idle')
    const [error,     setError]     = useState<string | null>(null)
    const [lastFmt,   setLastFmt]   = useState<Format | null>(null)

    async function download(format: Format) {
        setStatus('loading')
        setError(null)
        setLastFmt(format)

        try {
            const params = new URLSearchParams()
            if (startDate) params.set('startDate', startDate)
            if (endDate)   params.set('endDate',   endDate)
            if (asset)     params.set('asset',     asset)

            const endpoint = `/api/reports/export/${format}?${params}`

            const res = await apiFetchBlob(endpoint)

            // Derive filename from Content-Disposition header
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

            setStatus('success')
            setTimeout(() => setStatus('idle'), 3000)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Export failed')
            setStatus('error')
            setTimeout(() => { setStatus('idle'); setError(null) }, 5000)
        }
    }

    const isLoading = status === 'loading'

    return (
        <div className="bg-[#080808] border border-white/[0.07] rounded-xl p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Download size={15} className="text-white/50" />
                <span className="text-sm font-semibold text-white tracking-wide">Export Reports</span>
            </div>

            {/* Date range */}
            <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={9} /> Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <div className="text-[9px] text-white/25 mb-1">From</div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5
                                       text-[11px] text-white/80 outline-none focus:border-white/20
                                       [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <div className="text-[9px] text-white/25 mb-1">To</div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5
                                       text-[11px] text-white/80 outline-none focus:border-white/20
                                       [color-scheme:dark]"
                        />
                    </div>
                </div>
            </div>

            {/* Asset filter */}
            <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1">
                    <Filter size={9} /> Asset Filter
                </label>
                <select
                    value={asset}
                    onChange={e => setAsset(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5
                               text-[11px] text-white/70 outline-none focus:border-white/20"
                >
                    <option value="">All assets</option>
                    {COINS.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Download buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => download('excel')}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-semibold
                               transition-all border
                               ${isLoading && lastFmt === 'excel'
                                   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-wait'
                                   : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                               }
                               disabled:opacity-50`}
                >
                    {isLoading && lastFmt === 'excel' ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <FileSpreadsheet size={12} />
                    )}
                    Excel (.xlsx)
                </button>

                <button
                    onClick={() => download('pdf')}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-semibold
                               transition-all border
                               ${isLoading && lastFmt === 'pdf'
                                   ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-wait'
                                   : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40'
                               }
                               disabled:opacity-50`}
                >
                    {isLoading && lastFmt === 'pdf' ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <FileText size={12} />
                    )}
                    PDF
                </button>
            </div>

            {/* Status messages */}
            {status === 'success' && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                    <CheckCircle size={11} />
                    <span>Report downloaded successfully</span>
                </div>
            )}
            {status === 'error' && error && (
                <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    <AlertCircle size={11} />
                    <span>{error}</span>
                </div>
            )}

            {/* Info note */}
            <p className="text-[9px] text-white/20 leading-relaxed">
                Reports include portfolio positions, trade history, ledger entries, and P/L statements.
                All figures use precise financial arithmetic.
            </p>
        </div>
    )
}
