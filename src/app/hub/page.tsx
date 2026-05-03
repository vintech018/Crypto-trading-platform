'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Wallet, TrendingUp, TrendingDown, CandlestickChart,
    BarChart3, Cpu, ArrowLeft, Layers, Activity,
    ArrowUpRight, ArrowDownRight, ChevronRight, Zap, Bot,
    Play, Square, Plus
} from 'lucide-react'
import { getBinanceManager } from '@/services/binanceSocket'
import { useMarketStore } from '@/state/marketStore'
import { api, type Bot as ApiBot } from '@/lib/api'
import { getSocket } from '@/lib/socket'

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
            whileHover={{ scale: 1.02, y: -3 }}
            className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.015] p-7 overflow-hidden group cursor-default"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.04)` }}
        >
            {/* Glow on hover */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${glowColor} 0%, transparent 60%)` }}
            />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                    <span className="text-[11px] text-white/45 uppercase tracking-[0.15em] font-medium">{label}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm" style={{ background: `${glowColor.replace('0.15', '0.12')}` }}>
                        <Icon size={16} className="text-white/60" />
                    </div>
                </div>
                <div className="text-3xl font-mono font-bold text-white tracking-tight">{value}</div>
                {sub && <div className="text-[12px] text-white/30 mt-2">{sub}</div>}
            </div>
        </motion.div>
    )
}

function QuickActionBtn({ href, icon: Icon, label, description, primary, accentColor }: {
    href: string
    icon: React.ElementType
    label: string
    description: string
    primary?: boolean
    accentColor?: string
}) {
    const accent = accentColor || 'rgba(255,255,255,0.08)'
    return (
        <Link href={href} className="block h-full">
            <motion.div
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex flex-col justify-between h-full p-6 rounded-2xl border cursor-pointer transition-all duration-400 group overflow-hidden
          ${primary
                        ? 'border-white/25 bg-white text-black shadow-[0_0_60px_rgba(255,255,255,0.1),0_4px_30px_rgba(255,255,255,0.08)]'
                        : 'border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent text-white hover:border-white/[0.15]'
                    }`}
            >
                {/* Shimmer overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: primary ? 'none' : `radial-gradient(ellipse at 30% 0%, ${accent} 0%, transparent 70%)` }} />
                
                <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 ${primary ? 'bg-black/[0.07]' : ''}`}
                        style={!primary ? { background: accent } : {}}>
                        <Icon size={20} className={primary ? 'text-black/80' : 'text-white/90'} />
                    </div>
                    <div className={`font-semibold text-[15px] leading-tight ${primary ? 'text-black' : 'text-white'}`}>{label}</div>
                    <div className={`text-[11px] mt-2 leading-relaxed ${primary ? 'text-black/45' : 'text-white/35'}`}>{description}</div>
                </div>
                <div className="relative z-10 mt-5 flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${primary ? 'text-black/40' : 'text-white/25'} group-hover:${primary ? 'text-black/60' : 'text-white/50'} transition-colors`}>
                        {primary ? 'Launch' : 'Open'}
                    </span>
                    <ChevronRight size={12} className={`${primary ? 'text-black/30' : 'text-white/20'} group-hover:translate-x-1.5 transition-transform duration-300`} />
                </div>
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
            <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 group/row hover:bg-white/[0.015] -mx-2 px-2 rounded-lg transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.positive ? 'bg-emerald-500/10 border border-emerald-500/15' : 'bg-red-500/10 border border-red-500/15'}`}>
                    {m.positive
                        ? <ArrowUpRight size={12} className="text-emerald-400" />
                        : <ArrowDownRight size={12} className="text-red-400" />
                    }
                </div>
                <span className="text-[12px] font-bold text-white flex-1">{m.sym}</span>
                {m.price && <span className="text-[11px] font-mono text-white/40">${m.price < 1 ? m.price.toFixed(4) : m.price.toFixed(2)}</span>}
                <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className={`h-full rounded-full ${m.positive ? 'bg-emerald-400/40' : 'bg-red-400/40'}`}
                            style={{ width: `${Math.min(Math.abs(m.pct) * 15, 100)}%` }} />
                    </div>
                    <span className={`text-[11px] font-mono font-semibold w-16 text-right ${m.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.positive ? '+' : ''}{m.pct.toFixed(2)}%
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.015] p-6 overflow-hidden">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <Activity size={13} className="text-white/50" />
                </div>
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-[0.15em]">Market Movers</span>
                <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-400/70 font-mono font-medium">LIVE</span>
                </span>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <div className="text-[9px] text-emerald-400/60 uppercase tracking-[0.15em] mb-3 font-semibold">Top Gainers</div>
                    {gainers.map(m => <MoverRow key={m.sym} m={m} />)}
                </div>
                <div>
                    <div className="text-[9px] text-red-400/60 uppercase tracking-[0.15em] mb-3 font-semibold">Top Losers</div>
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
    const dirColor = direction === 'bullish' ? 'emerald' : direction === 'bearish' ? 'red' : 'yellow'
    const msg = direction === 'bullish'
        ? `BTC momentum is currently bullish with increasing volume. Short-term upside continuation likely in the next 4–12 hours.`
        : direction === 'bearish'
            ? `BTC showing bearish pressure with declining buy-side strength. Consider waiting for support confirmation before entering longs.`
            : `BTC momentum is currently neutral with declining volatility. Potential breakout expected within the next 12 hours.`

    const confidence = direction === 'neutral' ? 62 : direction === 'bullish' ? 78 : 71

    return (
        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-6 overflow-hidden">
            {/* Subtle animated gradient accent */}
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-30"
                style={{ background: `radial-gradient(circle at 80% 20%, ${direction === 'bullish' ? 'rgba(16,185,129,0.2)' : direction === 'bearish' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'} 0%, transparent 70%)` }} />
            <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center`}>
                        <Cpu size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/70 uppercase tracking-[0.15em]">AI Market Insight</span>
                    <span className={`ml-auto text-[9px] font-bold px-3 py-1.5 rounded-full
              ${direction === 'bullish' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : direction === 'bearish' ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'}`}>
                        {dirLabel}
                    </span>
                </div>
                <p className="text-[13px] text-white/55 leading-[1.7]">{msg}</p>
                
                {/* Confidence meter */}
                <div className="mt-4 flex items-center gap-3">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">Confidence</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence}%` }}
                            transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${direction === 'bullish' ? 'bg-gradient-to-r from-emerald-500/40 to-emerald-400/70' : direction === 'bearish' ? 'bg-gradient-to-r from-red-500/40 to-red-400/70' : 'bg-gradient-to-r from-yellow-500/40 to-yellow-400/70'}`}
                        />
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${direction === 'bullish' ? 'text-emerald-400' : direction === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>{confidence}%</span>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center gap-2">
                    <Zap size={10} className="text-cyan-400/60" />
                    <span className="text-[9px] text-white/25">AI-generated insight · not financial advice</span>
                </div>
            </div>
        </div>
    )
}

// ─── Main Hub Page ───────────────────────────────────────────

export default function HubPage() {
    const equity = useMarketStore(s => s.equity)
    const buyingPower = useMarketStore(s => s.buyingPower)
    const positions = useMarketStore(s => s.positions)
    const prices = useMarketStore(s => s.prices)

    const [bots, setBots] = useState<ApiBot[]>([])
    const [botWallet, setBotWallet] = useState<{ balance: number } | null>(null)

    // Start ticker WebSocket for live price data on hub page
    useEffect(() => {
        getBinanceManager().connectTicker()
        
        // Initial fetch
        api.listBots().then(setBots).catch(() => {})
        api.getWallet().then(setBotWallet).catch(() => {})

        // Real-time socket updates for bots
        const socket = getSocket()
        if (!socket.connected) socket.connect()

        socket.on('bot:list', (list: ApiBot[]) => {
            setBots(list)
            api.getWallet().then(setBotWallet).catch(() => {})
        })

        socket.on('bot:update', (updated: ApiBot) => {
            setBots(prev => prev.map(b => b.id === updated.id ? updated : b))
        })

        return () => {
            socket.off('bot:list')
            socket.off('bot:update')
        }
    }, [])

    const btcPrice = prices['BTCUSDT']?.price ?? 0
    const ethPrice = prices['ETHUSDT']?.price ?? 0

    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    const manualUnrealizedPnl = positions.reduce((sum, pos) => {
        const current = prices[pos.symbol]?.price
        if (!current) return sum
        const pnl = pos.side === 'long'
            ? (current - pos.entryPrice) * pos.size * pos.leverage
            : (pos.entryPrice - current) * pos.size * pos.leverage
        return sum + pnl
    }, 0)

    const botUnrealizedPnl = bots.reduce((sum, b) => sum + (b.unrealizedPnl || 0), 0)
    const totalUnrealizedPnl = manualUnrealizedPnl + botUnrealizedPnl

    const botPositionsCount = bots.filter(b => b.position !== null).length
    const totalPositionsCount = positions.length + botPositionsCount

    const botCapital = bots.reduce((sum, b) => sum + (b.virtualBalance || b.amount), 0)
    const baseEquity = botWallet ? (botWallet.balance + botCapital) : equity
    const totalEquity = baseEquity + totalUnrealizedPnl
    
    // Total return based on the original 50k simulation, but adjust logic if needed.
    const totalReturn = ((totalEquity - 50000) / 50000) * 100
    
    const displayBuyingPower = botWallet ? botWallet.balance : buyingPower

    return (
        <>
            <style>{`
        html, body { overflow-y: auto; }
        .hub-bg {
          background-color: #050507;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 56px 56px;
          min-height: 100vh;
        }
        .hub-glow {
          position: fixed;
          top: -25%;
          left: 50%;
          transform: translateX(-50%);
          width: 1000px;
          height: 600px;
          background: radial-gradient(ellipse at center, rgba(6,182,212,0.03) 0%, rgba(255,255,255,0.02) 30%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .hub-glow-2 {
          position: fixed;
          bottom: -30%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16,185,129,0.025) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

            <div className="hub-bg relative" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                <div className="hub-glow" />
                <div className="hub-glow-2" />

                <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">

                    {/* Back link */}
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-10">
                        <ArrowLeft size={12} /> Back
                    </Link>

                    {/* ── Section 1: Greeting ─────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-5 mb-12"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.1] flex items-center justify-center shadow-lg">
                            <Wallet size={24} className="text-white/60" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">{greeting}, Trader</h1>
                            <p className="text-sm text-white/35 mt-1">Your trading environment is ready.</p>
                        </div>
                        <div className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] text-emerald-400 font-mono font-medium">Markets Open</span>
                        </div>
                    </motion.div>

                    {/* ── Section 2: Portfolio Snapshot ────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10"
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
                            value={`$${displayBuyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            sub="Available for trading"
                            icon={Wallet}
                            glowColor="rgba(6,182,212,0.15)"
                        />
                        <PortfolioCard
                            label="Open Positions"
                            value={totalPositionsCount.toString()}
                            sub={totalPositionsCount === 0 ? 'No active trades' : `P&L: ${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`}
                            icon={Layers}
                            glowColor={positions.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)'}
                        />
                    </motion.div>

                    {/* ── Section 3: Quick Actions ──────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.14 }}
                        className="mb-10"
                    >
                        <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold mb-4">Quick Actions</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <QuickActionBtn
                                href="/terminal"
                                icon={CandlestickChart}
                                label="Open Trading Terminal"
                                description="Live charts · order book · execution"
                                primary
                            />
                            <QuickActionBtn
                                href="/bots"
                                icon={Bot}
                                label="Trading Bots"
                                description="Algorithmic trading · 24/7 execution"
                                accentColor="rgba(16,185,129,0.12)"
                            />
                            <QuickActionBtn
                                href="/pablo"
                                icon={Bot}
                                label="Pablo AI"
                                description="Your elite trading analyst"
                                accentColor="rgba(6,182,212,0.12)"
                            />
                            <QuickActionBtn
                                href="/terminal"
                                icon={BarChart3}
                                label="Portfolio Overview"
                                description="Positions · P&L · equity curve"
                                accentColor="rgba(168,85,247,0.12)"
                            />
                        </div>
                    </motion.div>

                    {/* ── Section 4 + 5: Market Movers + AI Insight ────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10"
                    >
                        <MarketMovers />
                        <AIInsightCard />
                    </motion.div>



                    {/* ── Live prices strip ────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.24 }}
                        className="flex items-center gap-4 px-6 py-4 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.025] to-white/[0.01] flex-wrap"
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

                    {/* Footer note */}
                    <div className="mt-12 text-center text-[10px] text-white/15">
                        SOLIDUS · AI Crypto Trading Simulator · Virtual funds only · Not financial advice
                    </div>
                </div>
            </div>
        </>
    )
}
