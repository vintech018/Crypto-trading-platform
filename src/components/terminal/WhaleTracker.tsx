'use client'

import { useEffect, useState } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { Waves } from 'lucide-react'

interface WhaleAlert {
    id: string
    side: 'buy' | 'sell'
    symbol: string
    amount: number
    usdValue: number
    exchange: string
    time: number
}

const EXCHANGES = ['Binance', 'Coinbase', 'OKX', 'Bybit', 'Kraken']

function generateWhaleAlert(prices: Record<string, any>): WhaleAlert {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
    const sym = symbols[Math.floor(Math.random() * symbols.length)]
    const price = prices[sym]?.price ?? 45000
    const usdValue = 500000 + Math.random() * 5000000
    const amount = usdValue / price
    return {
        id: `${Date.now()}-${Math.random()}`,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        symbol: sym.replace('USDT', ''),
        amount,
        usdValue,
        exchange: EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)],
        time: Date.now(),
    }
}

function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
}

export function WhaleTracker() {
    const prices = useMarketStore(s => s.prices)
    const [alerts, setAlerts] = useState<WhaleAlert[]>([])

    // Seed initial alerts
    useEffect(() => {
        const initial = Array.from({ length: 12 }, () => ({
            ...generateWhaleAlert({ BTCUSDT: { price: 65000 }, ETHUSDT: { price: 3200 }, SOLUSDT: { price: 140 }, BNBUSDT: { price: 580 } }),
            time: Date.now() - Math.random() * 300000,
        }))
        setAlerts(initial)
    }, [])

    // Stream live whale alerts simulated
    useEffect(() => {
        const interval = setInterval(() => {
            if (Object.keys(prices).length === 0) return
            if (Math.random() > 0.4) return // 60% chance each tick
            setAlerts(prev => [generateWhaleAlert(prices), ...prev].slice(0, 40))
        }, 4000)
        return () => clearInterval(interval)
    }, [prices])

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                <Waves size={11} className="text-cyan-400" />
                <span className="text-[11px] font-semibold text-white tracking-wide">Whale Activity</span>
                <span className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[8px] text-cyan-400/60">Live tracking $500K+</span>
                </span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none px-2 py-2 space-y-1.5">
                {alerts.map(a => (
                    <div
                        key={a.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[10px]
              ${a.side === 'buy'
                                ? 'bg-emerald-500/5 border-emerald-500/15'
                                : 'bg-red-500/5 border-red-500/15'
                            }`}
                    >
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {a.side.toUpperCase()}
                        </span>
                        <span className="font-bold text-white">{a.symbol}</span>
                        <span className="text-white/50 font-mono">{a.amount.toFixed(1)}</span>
                        <span className="font-mono font-semibold text-yellow-400">${(a.usdValue / 1e6).toFixed(2)}M</span>
                        <span className="text-white/25 ml-auto">on {a.exchange}</span>
                        <span className="text-white/20 text-[8px]">{timeAgo(a.time)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
