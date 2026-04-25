'use client'

import { useMarketStore } from '@/state/marketStore'
import { useEffect, useState } from 'react'
import { Cpu, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Insight {
    id: string
    title: string
    signal: 'bullish' | 'bearish' | 'neutral'
    confidence: number
    text: string
    timeframe: string
}

const INSIGHT_TEMPLATES = {
    bullish: [
        "Strong buying pressure detected with rising volume. Bullish momentum building.",
        "Price action consolidating above key support. Breakout likely.",
        "RSI recovering from oversold zone. Trend reversal signal.",
        "Increasing whale accumulation detected. Institutional buying confirmed.",
    ],
    bearish: [
        "Declining volume on rallies signals weakness. Resistance likely to hold.",
        "RSI entering overbought territory. Pullback expected.",
        "Large sell walls detected in order book. Bearish pressure mounting.",
        "Distribution pattern forming at current levels. Short opportunity present.",
    ],
    neutral: [
        "Price consolidating in tight range. Breakout direction unclear.",
        "Mixed signals — wait for volume confirmation before entering.",
        "Low volatility phase. Volatility squeeze may precede large move.",
        "Market indecision at key level. Risk/reward unfavorable.",
    ],
}

function generateInsights(symbol: string, price: number, changePct: number): Insight[] {
    const trend = changePct > 0.5 ? 'bullish' : changePct < -0.5 ? 'bearish' : 'neutral'
    const shortSym = symbol.replace('USDT', '')
    const confidence = 55 + Math.abs(changePct) * 6 + Math.random() * 12

    return [
        {
            id: 'trend',
            title: 'Trend Direction',
            signal: trend,
            confidence: Math.min(95, confidence),
            text: INSIGHT_TEMPLATES[trend][Math.floor(Math.random() * 4)],
            timeframe: '4H',
        },
        {
            id: 'momentum',
            title: 'Momentum Score',
            signal: changePct > 1 ? 'bullish' : changePct < -1 ? 'bearish' : 'neutral',
            confidence: Math.min(88, 50 + Math.abs(changePct) * 4),
            text: `${shortSym} momentum indicator at ${(50 + changePct * 5).toFixed(0)}/100. ${Math.abs(changePct) > 1 ? 'Strong directional bias' : 'Neutral momentum zone'}.`,
            timeframe: '1H',
        },
        {
            id: 'volatility',
            title: 'Volatility Risk',
            signal: Math.abs(changePct) > 3 ? 'bearish' : Math.abs(changePct) < 1 ? 'bullish' : 'neutral',
            confidence: 72,
            text: `24H volatility ${Math.abs(changePct) > 3 ? 'elevated — high risk' : Math.abs(changePct) < 1 ? 'compressed — breakout expected' : 'moderate'}. ATR suggests ±${(price * 0.015).toFixed(0)} range.`,
            timeframe: '1D',
        },
        {
            id: 'signal',
            title: 'AI Trade Signal',
            signal: trend,
            confidence: Math.min(92, confidence - 5),
            text: `${trend === 'bullish' ? `${shortSym} LONG SIGNAL — enter near $${(price * 0.998).toFixed(2)}, target $${(price * 1.025).toFixed(2)}` : trend === 'bearish' ? `${shortSym} SHORT SIGNAL — entry $${(price * 1.002).toFixed(2)}, target $${(price * 0.975).toFixed(2)}` : `Hold current position. No high-conviction signal.`}`,
            timeframe: '4H',
        },
    ]
}

const SignalIcon = ({ signal }: { signal: Insight['signal'] }) => {
    if (signal === 'bullish') return <TrendingUp size={12} className="text-emerald-400" />
    if (signal === 'bearish') return <TrendingDown size={12} className="text-red-400" />
    return <Minus size={12} className="text-yellow-400" />
}

export function AIInsights() {
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const prices = useMarketStore(s => s.prices)
    const [insights, setInsights] = useState<Insight[]>([])
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now())

    useEffect(() => {
        const tick = prices[activeSymbol]
        if (!tick) return
        setInsights(generateInsights(activeSymbol, tick.price, tick.changePct24h))
        setLastUpdate(Date.now())
    }, [activeSymbol, prices[activeSymbol]?.price])

    const SENTIMENT_SCORE = insights.reduce((acc, ins) => {
        return acc + (ins.signal === 'bullish' ? 1 : ins.signal === 'bearish' ? -1 : 0)
    }, 0)

    const sentimentLabel = SENTIMENT_SCORE > 1 ? 'Bullish' : SENTIMENT_SCORE < -1 ? 'Bearish' : SENTIMENT_SCORE > 0 ? 'Slightly Bullish' : 'Neutral'
    const sentimentColor = SENTIMENT_SCORE > 0 ? 'text-emerald-400' : SENTIMENT_SCORE < 0 ? 'text-red-400' : 'text-yellow-400'

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                <Cpu size={11} className="text-cyan-400" />
                <span className="text-[11px] font-semibold text-white tracking-wide">AI Market Insights</span>
                <span className="ml-auto text-[8px] text-white/20">Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago</span>
            </div>

            {/* Sentiment banner */}
            <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <span className="text-[9px] text-white/30 uppercase tracking-wider">Overall Sentiment</span>
                <span className={`text-xs font-bold ${sentimentColor}`}>{sentimentLabel}</span>
            </div>

            {/* Insight cards */}
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2 scrollbar-none">
                {insights.map(ins => (
                    <div key={ins.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <SignalIcon signal={ins.signal} />
                                <span className="text-[10px] font-semibold text-white">{ins.title}</span>
                                <span className="text-[8px] text-white/30">{ins.timeframe}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[8px] text-white/30">AI Confidence</span>
                                <span className={`text-[10px] font-mono font-bold ${ins.confidence > 75 ? 'text-emerald-400' : ins.confidence > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {ins.confidence.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        {/* Confidence bar */}
                        <div className="h-0.5 bg-white/[0.06] rounded-full mb-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${ins.signal === 'bullish' ? 'bg-emerald-500' : ins.signal === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                style={{ width: `${ins.confidence}%`, transition: 'width 1s ease' }}
                            />
                        </div>
                        <p className="text-[9px] text-white/45 leading-relaxed">{ins.text}</p>
                    </div>
                ))}
            </div>

            <div className="px-3 py-1.5 border-t border-white/[0.04]">
                <span className="text-[8px] text-white/15">⚠ AI insights are simulated and not financial advice.</span>
            </div>
        </div>
    )
}
