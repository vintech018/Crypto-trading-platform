'use client'

import { useEffect, useRef, useState } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { getBinanceManager, destroyAllSockets } from '@/services/binanceSocket'
import { GlobalTicker } from '@/components/terminal/Ticker'
import { LeftNav } from '@/components/terminal/LeftNav'
import { ChartPanel } from '@/components/terminal/ChartPanel'
import { OrderBook } from '@/components/terminal/OrderBook'
import { TradesFeed } from '@/components/terminal/TradesFeed'
import { MarketStats } from '@/components/terminal/MarketStats'
import { TradeExecution } from '@/components/terminal/TradeExecution'
import { PortfolioPanel } from '@/components/terminal/PortfolioPanel'
import { AIInsights } from '@/components/terminal/AIInsights'
import { WhaleTracker } from '@/components/terminal/WhaleTracker'
import { OnChainPanel } from '@/components/terminal/OnChainPanel'
import { AlertsPanel } from '@/components/terminal/AlertsPanel'
import { OpenOrders } from '@/components/terminal/OpenOrders'
import { TradeHistory } from '@/components/terminal/TradeHistory'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PANEL_COMPONENTS: Record<string, React.FC> = {
    chart: ChartPanel,
    orderbook: OrderBook,
    trades: TradesFeed,
    portfolio: PortfolioPanel,
    ai: AIInsights,
    whale: WhaleTracker,
    onchain: OnChainPanel,
    alerts: AlertsPanel,
    orders: OpenOrders,
    history: TradeHistory,
}

function RightSidebar() {
    const activePanel = useMarketStore(s => s.activePanel)
    const PanelComp = PANEL_COMPONENTS[activePanel]

    return (
        <div className="w-[300px] min-w-[260px] max-w-[320px] h-full flex flex-col border-l border-white/[0.06] bg-[#020202]">
            {/* Upper panel — dynamic based on nav */}
            <div className="flex-1 overflow-hidden border-b border-white/[0.06]">
                {PanelComp ? <PanelComp /> : null}
            </div>

            {/* Always show market stats at bottom right */}
            <div className="shrink-0 border-b border-white/[0.06]">
                <MarketStats />
            </div>
        </div>
    )
}

function CenterArea() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chart takes most of the space */}
            <div className="flex-1 overflow-hidden">
                <ChartPanel />
            </div>

            {/* Bottom Execution Panel */}
            <div className="h-[160px] shrink-0 border-t border-white/[0.06] bg-[#020202]">
                <TradeExecution />
            </div>
        </div>
    )
}

export default function TerminalPage() {
    const setActivePanel = useMarketStore(s => s.setActivePanel)
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const initFromBackend = useMarketStore(s => s.initFromBackend)
    const initialized = useRef(false)

    // Loading overlay state
    const LOAD_MESSAGES = [
        'Initializing market feeds…',
        'Connecting to Binance WebSocket…',
        'Loading chart engine…',
        'Synchronizing market data…',
    ]
    const [loadingDone, setLoadingDone] = useState(false)
    const [loadMsg, setLoadMsg] = useState(0)

    // Boot WebSocket connections + load backend portfolio
    useEffect(() => {
        if (initialized.current) return
        initialized.current = true
        const mgr = getBinanceManager()
        mgr.connectTicker()
        mgr.connectDepth(activeSymbol)
        mgr.connectTrades(activeSymbol)
        // Load wallet & holdings from backend (no-op if not logged in)
        initFromBackend()
    }, [])  // eslint-disable-line react-hooks/exhaustive-deps

    // Loading sequence — cycle messages then fade out after 1.5s
    useEffect(() => {
        let msgIdx = 0
        const msgTimer = setInterval(() => {
            msgIdx++
            if (msgIdx < LOAD_MESSAGES.length) setLoadMsg(msgIdx)
            else clearInterval(msgTimer)
        }, 350)
        const doneTimer = setTimeout(() => setLoadingDone(true), 1600)
        return () => { clearInterval(msgTimer); clearTimeout(doneTimer) }
    }, [])

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
            switch (e.key.toLowerCase()) {
                case 't': setActivePanel('chart'); break
                case 'o': setActivePanel('orderbook'); break
                case 'p': setActivePanel('portfolio'); break
                case 'a': setActivePanel('ai'); break
                case 'w': setActivePanel('whale'); break
                case 'n': setActivePanel('alerts'); break
                case 'r': setActivePanel('orders'); break
                case 'h': setActivePanel('history'); break
                case 'f':
                    document.fullscreenElement
                        ? document.exitFullscreen()
                        : document.documentElement.requestFullscreen()
                    break
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [setActivePanel])

    return (
        <>
            {/* Terminal-specific styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
        html, body { overflow: hidden; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }

        /* Ticker scroll animation */
        .ticker-scroll {
          display: flex;
          animation: ticker-move 60s linear infinite;
        }
        .ticker-scroll:hover { animation-play-state: paused; }
        @keyframes ticker-move {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Price flash animations */
        .ticker-price.flash-up {
          animation: flash-green 0.5s ease;
        }
        .ticker-price.flash-down {
          animation: flash-red 0.5s ease;
        }
        @keyframes flash-green {
          0%, 100% { color: inherit; }
          50% { color: #10b981; text-shadow: 0 0 8px rgba(16,185,129,0.8); }
        }
        @keyframes flash-red {
          0%, 100% { color: inherit; }
          50% { color: #ef4444; text-shadow: 0 0 8px rgba(239,68,68,0.8); }
        }

        /* Trading grid background */
        .terminal-bg {
          background-color: #000;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Loading overlay fade */
        .terminal-loading {
          transition: opacity 0.5s ease, visibility 0.5s ease;
        }
        .terminal-loading.done {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
      ` }} />

            {/* Loading overlay */}
            <div className={`terminal-loading fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-6 ${loadingDone ? 'done' : ''}`}>
                {/* Logo */}
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-2 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                    <span className="text-black text-2xl font-black">S</span>
                </div>
                <div className="text-white text-lg font-bold tracking-wider">SOLIDUS</div>
                {/* Spinner */}
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                {/* Message */}
                <div className="h-5 flex items-center">
                    <span className="text-[11px] font-mono text-white/40 tracking-widest transition-all duration-300">
                        {LOAD_MESSAGES[loadMsg]}
                    </span>
                </div>
                {/* Progress bar */}
                <div className="w-48 h-px bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white/60 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${((loadMsg + 1) / LOAD_MESSAGES.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="terminal-bg w-screen h-screen flex flex-col overflow-hidden text-white select-none" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                {/* Global Ticker */}
                <GlobalTicker />

                {/* Main layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left nav */}
                    <LeftNav />

                    {/* Center: chart + execution */}
                    <CenterArea />

                    {/* Right sidebar */}
                    <RightSidebar />
                </div>

                {/* Tiny back link */}
                <Link
                    href="/hub"
                    className="absolute bottom-2 right-2 text-[9px] text-white/15 hover:text-white/40 transition-colors z-50 flex items-center gap-1"
                >
                    <ArrowLeft size={9} /> Hub
                </Link>
            </div>
        </>
    )
}
