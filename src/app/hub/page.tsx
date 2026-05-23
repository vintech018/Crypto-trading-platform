'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
    Wallet, TrendingUp, CandlestickChart,
    BarChart3, Cpu, ArrowLeft, Layers, Activity,
    ArrowUpRight, ArrowDownRight, ChevronRight, Zap, FileBarChart, Camera, Loader2
} from 'lucide-react'

import { getBinanceManager } from '@/services/binanceSocket'
import { useMarketStore } from '@/state/marketStore'
import { api, auth, ApiResponse } from '@/lib/apiClient'
import { ExportReports } from '@/components/terminal/ExportReports'

// ─── Sub-components ─────────────────────────────────────────

function PortfolioCard({ label, value, sub, icon: Icon, glowColor }: {
    label: string
    value: string
    sub?: string
    icon: React.ElementType
    glowColor: string
}) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 overflow-hidden group cursor-default"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.04)` }}
        >
            {/* Glow on hover */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${glowColor} 0%, transparent 70%)` }}
            />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] text-white/40 uppercase tracking-widest font-medium">{label}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${glowColor.replace('0.15', '0.1')}` }}>
                        <Icon size={15} className="text-white/60" />
                    </div>
                </div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">{value}</div>
                {sub && <div className="text-[11px] text-white/30 mt-1.5">{sub}</div>}
            </div>
        </motion.div>
    )
}

function QuickActionBtn({ href, icon: Icon, label, description, primary, onClick }: {
    href: string
    icon: React.ElementType
    label: string
    description: string
    primary?: boolean
    onClick?: () => void
}) {
    return (
        <Link href={href} className="flex h-full" onClick={onClick}>
            <motion.div
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-4 p-5 w-full h-full rounded-xl border cursor-pointer transition-all group
          ${primary
                        ? 'border-white/20 bg-white text-black hover:bg-white/95 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                        : 'border-white/[0.08] bg-white/[0.025] text-white hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
            >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${primary ? 'bg-black/10' : 'bg-white/5'}`}>
                    <Icon size={18} className={primary ? 'text-black' : 'text-white/70'} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${primary ? 'text-black' : 'text-white'}`}>{label}</div>
                    <div className={`text-[11px] mt-0.5 ${primary ? 'text-black/50' : 'text-white/35'}`}>{description}</div>
                </div>
                <ChevronRight size={15} className={`shrink-0 ${primary ? 'text-black/40' : 'text-white/20'} group-hover:translate-x-0.5 transition-transform`} />
            </motion.div>
        </Link>
    )
}

const MARKET_MOVER_FALLBACK = [
    { sym: 'SOL', pct: +5.23, positive: true },
    { sym: 'AVAX', pct: +3.81, positive: true },
    { sym: 'BNB', pct: +1.42, positive: true },
    { sym: 'LINK', pct: -2.14, positive: false },
    { sym: 'DOGE', pct: -3.67, positive: false },
    { sym: 'XRP', pct: -0.84, positive: false },
]

const SYMBOL_MAP: Record<string, string> = {
    SOL: 'SOLUSDT', AVAX: 'AVAXUSDT', BNB: 'BNBUSDT',
    LINK: 'LINKUSDT', DOGE: 'DOGEUSDT', XRP: 'XRPUSDT',
    BTC: 'BTCUSDT', ETH: 'ETHUSDT',
}

function MarketMovers() {
    const prices = useMarketStore(s => s.prices)

    const movers = MARKET_MOVER_FALLBACK.map(fb => {
        const tick = prices[SYMBOL_MAP[fb.sym]]
        return tick
            ? { sym: fb.sym, pct: tick.changePct24h, positive: tick.changePct24h >= 0, price: tick.price }
            : { ...fb, price: null }
    }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))

    const gainers = movers.filter(m => m.positive).slice(0, 3)
    const losers = movers.filter(m => !m.positive).slice(0, 3)

    function MoverRow({ m }: { m: typeof movers[0] }) {
        return (
            <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${m.positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {m.positive
                        ? <ArrowUpRight size={12} className="text-emerald-400" />
                        : <ArrowDownRight size={12} className="text-red-400" />
                    }
                </div>
                <span className="text-[12px] font-bold text-white flex-1">{m.sym}</span>
                {m.price && <span className="text-[11px] font-mono text-white/40">${m.price < 1 ? m.price.toFixed(4) : m.price.toFixed(2)}</span>}
                <span className={`text-[11px] font-mono font-semibold w-14 text-right ${m.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.positive ? '+' : ''}{m.pct.toFixed(2)}%
                </span>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={13} className="text-white/40" />
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">Market Movers</span>
                <span className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-400/60 font-mono">LIVE</span>
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-[9px] text-emerald-400/60 uppercase tracking-widest mb-2 font-semibold">Top Gainers</div>
                    {gainers.map(m => <MoverRow key={m.sym} m={m} />)}
                </div>
                <div>
                    <div className="text-[9px] text-red-400/60 uppercase tracking-widest mb-2 font-semibold">Top Losers</div>
                    {losers.map(m => <MoverRow key={m.sym} m={m} />)}
                </div>
            </div>
        </div>
    )
}

function AIInsightCard() {
    const prices = useMarketStore(s => s.prices)
    const btc = prices['BTCUSDT']
    const pct = btc?.changePct24h ?? 0
    const direction = pct > 0.5 ? 'bullish' : pct < -0.5 ? 'bearish' : 'neutral'
    const dirLabel = direction === 'bullish' ? 'Bullish' : direction === 'bearish' ? 'Bearish' : 'Neutral'
    const msg = direction === 'bullish'
        ? `BTC momentum is currently bullish with increasing volume. Short-term upside continuation likely in the next 4–12 hours.`
        : direction === 'bearish'
            ? `BTC showing bearish pressure with declining buy-side strength. Consider waiting for support confirmation before entering longs.`
            : `BTC momentum is currently neutral with declining volatility. Potential breakout expected within the next 12 hours.`

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center gap-2 mb-3">
                <Cpu size={13} className="text-cyan-400" />
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">AI Market Insight</span>
                <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full
          ${direction === 'bullish' ? 'bg-emerald-500/15 text-emerald-400'
                        : direction === 'bearish' ? 'bg-red-500/15 text-red-400'
                            : 'bg-yellow-500/15 text-yellow-400'}`}>
                    {dirLabel}
                </span>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed">{msg}</p>
            <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
                <Zap size={10} className="text-cyan-400/60" />
                <span className="text-[9px] text-white/20">AI-generated insight · not financial advice</span>
            </div>
        </div>
    )
}

// ─── Inline Avatar Component ──────────────────────────────────
function HubAvatarUpload({
    currentUrl,
    userName,
    onSuccess,
}: {
    currentUrl: string | null
    userName: string | null
    onSuccess: (url: string) => void
}) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            setError(null)
            const formData = new FormData()
            formData.append('avatar', file)

            const res = await api.post<ApiResponse<{ profilePicture: string }>>(
                '/api/uploads/avatar',
                formData
            )

            if (res.success && res.data?.profilePicture) {
                onSuccess(res.data.profilePicture)
            } else {
                throw new Error(res.message || 'Upload failed')
            }
        } catch (err: unknown) {
            console.error('Avatar upload failed:', err)
            setError(err instanceof Error ? err.message : 'Failed to upload avatar')
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    return (
        <div className="relative group shrink-0">
            <input
                type="file"
                ref={fileRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
            />

            <button
                onClick={() => !uploading && fileRef.current?.click()}
                disabled={uploading}
                className="relative w-16 h-16 rounded-full overflow-hidden border border-white/[0.15] bg-white/[0.05] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:border-white/[0.3]"
            >
                {currentUrl ? (
                    <Image src={currentUrl} alt="Avatar" width={64} height={64} unoptimized className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xl font-bold text-white/50">{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}

                {/* Uploading Overlay */}
                {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-cyan-400 w-5 h-5" />
                    </div>
                )}

                {/* Hover Overlay */}
                {!uploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Camera className="w-4 h-4 text-white/80 mb-0.5" />
                        <span className="text-[8px] font-bold text-white/80 uppercase tracking-wider">Change</span>
                    </div>
                )}
            </button>

            {/* Error Toast */}
            {error && (
                <div className="absolute top-full mt-2 left-0 w-max max-w-xs bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-1.5 rounded-lg z-20 shadow-lg">
                    {error}
                </div>
            )}
        </div>
    )
}

// ─── Main Hub Page ───────────────────────────────────────────

export default function HubPage() {
    const buyingPower       = useMarketStore(s => s.walletBalance)
    const holdings          = useMarketStore(s => s.holdings)
    const prices            = useMarketStore(s => s.prices)
    const initFromBackend   = useMarketStore(s => s.initFromBackend)
    const [userName, setUserName] = useState<string | null>(null)
    const [userAvatar, setUserAvatar] = useState<string | null>(null)
    const [mounted,  setMounted]  = useState(false)
    const isInitialized = useMarketStore(s => s.isInitialized)

    // Start ticker WebSocket for live price data on hub page
    useEffect(() => {
        if (typeof window !== 'undefined' && !auth.isLoggedIn()) {
            window.location.href = '/login?from=%2Fhub'
            return
        }
        setMounted(true)
        getBinanceManager().connectTicker()
        // Load real wallet data from backend
        initFromBackend()
        // Fetch user name and avatar for greeting
        api.get<ApiResponse<{ user: { name: string; email: string; profilePicture?: string } }>>('/api/auth/me')
            .then(res => {
                setUserName(res.data?.user?.name ?? null)
                setUserAvatar(res.data?.user?.profilePicture ?? null)
            })
            .catch(() => {})
    }, [])  // eslint-disable-line react-hooks/exhaustive-deps


    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    const totalUnrealizedPnl = holdings.reduce((sum, h) => {
        const tick = prices[`${h.coin}USDT`]
        const current = tick?.price || h.currentPrice
        const pnl = (current - h.avgBuyPrice) * h.quantity
        return sum + pnl
    }, 0)

    const totalEquity = buyingPower + holdings.reduce((sum, h) => {
        const tick = prices[`${h.coin}USDT`]
        const current = tick?.price || h.currentPrice
        return sum + current * h.quantity
    }, 0)
    const baseEquity = 50000 // the initial deposit from DB
    const totalReturn = totalEquity > 0 ? ((totalEquity - baseEquity) / baseEquity) * 100 : 0
    const displayName = userName ?? 'Trader'

    if (!mounted || !isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white/50 text-sm font-mono">
                Loading your trading environment...
            </div>
        )
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
        html, body { overflow-y: auto; }
        .hub-bg {
          background-color: #000;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 48px 48px;
          min-height: 100vh;
        }
        .hub-glow {
          position: fixed;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
      ` }} />

            <div className="hub-bg relative" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                <div className="hub-glow" />

                <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">

                    {/* Back link */}
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-8">
                        <ArrowLeft size={12} /> Back
                    </Link>

                    {/* ── Section 1: Greeting ─────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-5 mb-10"
                    >
                        <HubAvatarUpload 
                            currentUrl={userAvatar}
                            userName={userName}
                            onSuccess={(newUrl) => setUserAvatar(newUrl)}
                        />
                        <div className="flex flex-col justify-center">
                            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">{greeting},<br className="sm:hidden" /> {displayName}</h1>
                            <p className="text-[13px] text-white/40 mt-1.5 font-medium tracking-wide">Your trading environment is ready.</p>
                        </div>
                        <div className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] text-emerald-400 font-mono tracking-widest font-semibold uppercase">Markets Open</span>
                        </div>
                    </motion.div>

                    {/* ── Section 2: Portfolio Snapshot ────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                    >
                        <PortfolioCard
                            label="Total Equity"
                            value={`$${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            sub={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}% all-time`}
                            icon={TrendingUp}
                            glowColor="rgba(255,255,255,0.06)"
                        />
                        <PortfolioCard
                            label="Buying Power"
                            value={`$${buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            sub="Available for trading"
                            icon={Wallet}
                            glowColor="rgba(6,182,212,0.15)"
                        />
                        <PortfolioCard
                            label="Open Positions"
                            value={holdings.length.toString()}
                            sub={holdings.length === 0 ? 'No active trades' : `P&L: ${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`}
                            icon={Layers}
                            glowColor={holdings.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)'}
                        />
                    </motion.div>

                    {/* ── Section 3: Quick Actions ──────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.14 }}
                        className="mb-8"
                    >
                        <div className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-3">Quick Actions</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <QuickActionBtn
                                href="/terminal"
                                icon={CandlestickChart}
                                label="Open Trading Terminal"
                                description="Live charts · order book · execution"
                                primary
                            />
                            <QuickActionBtn
                                href="/terminal"
                                icon={Cpu}
                                label="AI Market Insights"
                                description="Signals · momentum · volatility"
                            />
                            <QuickActionBtn
                                href="/reports"
                                icon={FileBarChart}
                                label="Trade Reports"
                                description="History · P/L · Excel & PDF export"
                            />
                            <QuickActionBtn
                                href="/hub/analytics"
                                icon={BarChart3}
                                label="PostgreSQL Analytics"
                                description="Advanced metrics · P/L · streaks"
                                onClick={() => console.log("PostgreSQL analytics clicked")}
                            />
                        </div>
                    </motion.div>

                    {/* ── Section 4 + 5: Market Movers + AI Insight ────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
                    >
                        <MarketMovers />
                        <AIInsightCard />
                    </motion.div>

                    {/* ── Live prices strip ────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.28 }}
                        className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.015] flex-wrap"
                    >
                        <span className="text-[9px] text-white/25 uppercase tracking-widest font-semibold shrink-0">Prices</span>
                        {[
                            { sym: 'BTCUSDT', label: 'BTC' },
                            { sym: 'ETHUSDT', label: 'ETH' },
                            { sym: 'SOLUSDT', label: 'SOL' },
                            { sym: 'BNBUSDT', label: 'BNB' },
                        ].map(({ sym, label }) => {
                            const tick = prices[sym]
                            const isUp = (tick?.changePct24h ?? 0) >= 0
                            return (
                                <div key={sym} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-white/40 font-semibold">{label}</span>
                                    <span className="text-[10px] font-mono text-white">{tick ? `$${tick.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '---'}</span>
                                    <span className={`text-[9px] font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {tick ? `${isUp ? '+' : ''}${tick.changePct24h.toFixed(2)}%` : ''}
                                    </span>
                                    <span className="w-px h-3 bg-white/10 ml-1" />
                                </div>
                            )
                        })}
                        <span className="ml-auto flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] text-emerald-400/50 font-mono">Live via Binance</span>
                        </span>
                    </motion.div>

                    {/* ── Export Reports ────────────────────────────── */}
                    {mounted && auth.isLoggedIn() && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="mt-6 max-w-sm"
                        >
                            <ExportReports />
                        </motion.div>
                    )}

                    {/* Footer note */}
                    <div className="mt-8 text-center text-[10px] text-white/15">
                        SOLIDUS · AI Crypto Trading Simulator · Virtual funds only · Not financial advice
                    </div>
                </div>
            </div>
        </>
    )
}
