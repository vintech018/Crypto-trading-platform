'use client'

import { useMarketStore } from '@/state/marketStore'

export function MarketStats() {
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const tick = useMarketStore(s => s.prices[activeSymbol])
    const shortSym = activeSymbol.replace('USDT', '')

    const stats = tick ? [
        { label: '24H High', value: `$${tick.high24h.toFixed(2)}`, color: 'text-emerald-400' },
        { label: '24H Low', value: `$${tick.low24h.toFixed(2)}`, color: 'text-red-400' },
        { label: '24H Vol', value: tick.volume24h >= 1e6 ? `${(tick.volume24h / 1e6).toFixed(2)}M ${shortSym}` : `${tick.volume24h.toFixed(0)} ${shortSym}`, color: 'text-white' },
        { label: '24H Change', value: `${(tick.changePct24h >= 0 ? '+' : '')}${tick.changePct24h.toFixed(2)}%`, color: tick.changePct24h >= 0 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Open Int.', value: `$${(tick.price * tick.volume24h * 0.08).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-cyan-400' },
        { label: 'Funding', value: '0.0100%', color: 'text-yellow-400' },
    ] : []

    return (
        <div className="px-3 py-2">
            <span className="text-[11px] font-semibold text-white tracking-wide block mb-2">Market Stats</span>
            {stats.length === 0 ? (
                <div className="text-white/20 text-[10px] py-2">Loading…</div>
            ) : (
                <div className="space-y-1.5">
                    {stats.map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                            <span className="text-[10px] text-white/35">{s.label}</span>
                            <span className={`text-[10px] font-mono font-semibold ${s.color}`}>{s.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
