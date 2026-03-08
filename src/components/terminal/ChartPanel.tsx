'use client'

import { useEffect, useRef, useState, memo } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { LayoutGrid, Square } from 'lucide-react'

const TIMEFRAMES = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1H' },
    { value: '240', label: '4H' },
    { value: 'D', label: '1D' },
]

const QUAD_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

interface TVChartProps {
    symbol: string
    interval: string
}

const TVChart = memo(function TVChart({ symbol, interval }: TVChartProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!ref.current) return
        ref.current.innerHTML = ''

        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        container.style.height = '100%'
        container.style.width = '100%'

        const inner = document.createElement('div')
        inner.className = 'tradingview-widget-container__widget'
        inner.style.height = '100%'
        inner.style.width = '100%'

        const script = document.createElement('script')
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
        script.async = true
        script.textContent = JSON.stringify({
            autosize: true,
            symbol: `BINANCE:${symbol}`,
            interval,
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            backgroundColor: '#000000',
            gridColor: 'rgba(255, 255, 255, 0.04)',
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            calendar: false,
            hide_volume: false,
            support_host: 'https://www.tradingview.com',
            studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'MASimple@tv-basicstudies'],
            withdateranges: true,
            allow_symbol_change: true,
        })

        container.appendChild(inner)
        container.appendChild(script)
        ref.current.appendChild(container)

        // Fire a resize event whenever the container dimensions change so
        // TradingView's embedded iframe recalculates its own layout.
        const ro = new ResizeObserver(() => {
            window.dispatchEvent(new Event('resize'))
        })
        if (ref.current) ro.observe(ref.current)

        return () => {
            ro.disconnect()
            if (ref.current) ref.current.innerHTML = ''
        }
    }, [symbol, interval])

    return <div ref={ref} className="w-full h-full overflow-hidden" />
})

export function ChartPanel() {
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const chartMode = useMarketStore(s => s.chartMode)
    const setChartMode = useMarketStore(s => s.setChartMode)
    const prices = useMarketStore(s => s.prices)
    const [tvInterval, setTvInterval] = useState('60')

    const tick = prices[activeSymbol]
    const isUp = (tick?.changePct24h ?? 0) >= 0
    const shortSym = activeSymbol.replace('USDT', '')

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Toolbar */}
            <div className="h-10 flex items-center px-3 gap-3 border-b border-white/[0.06] shrink-0 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-bold text-white">{shortSym}/USDT</span>
                    {tick && (
                        <>
                            <span className="text-[13px] font-mono text-white hidden sm:block">
                                ${tick.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                {isUp ? '+' : ''}{tick.changePct24h.toFixed(2)}%
                            </span>
                            {tick.high24h && (
                                <span className="hidden md:flex items-center gap-1 text-[10px] text-white/30">
                                    <span className="text-white/20">H</span> <span className="font-mono text-emerald-400/60">${tick.high24h.toFixed(2)}</span>
                                    <span className="text-white/20 ml-1">L</span> <span className="font-mono text-red-400/60">${tick.low24h.toFixed(2)}</span>
                                </span>
                            )}
                        </>
                    )}
                </div>

                <div className="flex-1" />

                {/* Timeframes */}
                <div className="flex items-center gap-0.5">
                    {TIMEFRAMES.map(tf => (
                        <button
                            key={tf.value}
                            onClick={() => setTvInterval(tf.value)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-all
                ${tvInterval === tf.value
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                <div className="w-px h-4 bg-white/10" />

                {/* Single/Quad */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setChartMode('single')}
                        title="Single chart"
                        className={`p-1.5 rounded transition-colors ${chartMode === 'single' ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
                    >
                        <Square size={13} />
                    </button>
                    <button
                        onClick={() => setChartMode('quad')}
                        title="Quad chart"
                        className={`p-1.5 rounded transition-colors ${chartMode === 'quad' ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
                    >
                        <LayoutGrid size={13} />
                    </button>
                </div>
            </div>

            {/* Chart area */}
            <div className="flex-1 overflow-hidden">
                {chartMode === 'single' ? (
                    <TVChart symbol={activeSymbol} interval={tvInterval} />
                ) : (
                    <div className="grid grid-cols-2 grid-rows-2 h-full gap-px bg-white/[0.04]">
                        {QUAD_SYMBOLS.map(sym => (
                            <div key={sym} className="relative bg-black overflow-hidden">
                                <div className="absolute top-1.5 left-2 z-10 text-[9px] font-bold text-white/40 pointer-events-none">
                                    {sym.replace('USDT', '')}/USDT
                                </div>
                                <TVChart symbol={sym} interval={tvInterval} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
