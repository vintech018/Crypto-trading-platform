'use client'

import { useEffect, useRef } from 'react'
import { useMarketStore } from '@/state/marketStore'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT']

const LABELS: Record<string, string> = {
    BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL',
    BNBUSDT: 'BNB', XRPUSDT: 'XRP', DOGEUSDT: 'DOGE',
    AVAXUSDT: 'AVAX', LINKUSDT: 'LINK',
}

// Coin logo URLs from CryptoLogos CDN
const LOGOS: Record<string, string> = {
    BTCUSDT: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=040',
    ETHUSDT: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=040',
    SOLUSDT: 'https://cryptologos.cc/logos/solana-sol-logo.svg?v=040',
    BNBUSDT: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=040',
    XRPUSDT: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg?v=040',
    DOGEUSDT: 'https://cryptologos.cc/logos/dogecoin-doge-logo.svg?v=040',
    AVAXUSDT: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg?v=040',
    LINKUSDT: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=040',
}

function fmt(n: number, sym: string) {
    if (sym === 'DOGEUSDT' || sym === 'XRPUSDT') return n.toFixed(4)
    if (n < 10) return n.toFixed(3)
    if (n < 1000) return n.toFixed(2)
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function TickerItem({ symbol }: { symbol: string }) {
    const tick = useMarketStore(s => s.prices[symbol])
    const prev = useRef<number | undefined>(undefined)
    const flashRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (!tick || !flashRef.current) return
        const el = flashRef.current
        const isUp = tick.price > (prev.current ?? tick.price)
        const cls = isUp ? 'flash-up' : 'flash-down'
        el.classList.remove('flash-up', 'flash-down')
        void el.offsetWidth
        el.classList.add(cls)
        const t = setTimeout(() => el.classList.remove(cls), 500)
        prev.current = tick.price
        return () => clearTimeout(t)
    }, [tick?.price])

    const isPositive = (tick?.changePct24h ?? 0) >= 0

    return (
        <div className="flex items-center gap-2 px-4 py-2 border-r border-white/5 shrink-0 hover:bg-white/[0.03] transition-colors cursor-default">
            {/* Coin logo */}
            <img
                src={LOGOS[symbol]}
                alt={LABELS[symbol]}
                width={16}
                height={16}
                className="w-4 h-4 rounded-full opacity-90 shrink-0"
                style={{ imageRendering: 'auto' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-xs font-bold text-white/60 tracking-wider">{LABELS[symbol]}</span>
            <span ref={flashRef} className="text-xs font-mono font-semibold text-white ticker-price">
                {tick ? `$${fmt(tick.price, symbol)}` : '---'}
            </span>
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {tick ? `${isPositive ? '+' : ''}${tick.changePct24h.toFixed(2)}%` : '---'}
            </span>
        </div>
    )
}

export function GlobalTicker() {
    return (
        <div className="h-9 bg-black/90 border-b border-white/[0.06] flex items-center overflow-hidden relative z-50">
            {/* Left gradient fade */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />

            {/* Scrolling strip */}
            <div className="flex items-center ticker-scroll">
                {[...SYMBOLS, ...SYMBOLS].map((sym, i) => (
                    <TickerItem key={`${sym}-${i}`} symbol={sym} />
                ))}
            </div>

            {/* Right gradient fade */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

            {/* Live indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-widest">Live</span>
            </div>
        </div>
    )
}
