'use client'

import { useState } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { TrendingUp, TrendingDown } from 'lucide-react'

type OrderType = 'market' | 'limit'
type Side = 'long' | 'short'

export function TradeExecution() {
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const prices = useMarketStore(s => s.prices)
    const buyingPower = useMarketStore(s => s.buyingPower)
    const addPosition = useMarketStore(s => s.addPosition)

    const [orderType, setOrderType] = useState<OrderType>('market')
    const [amount, setAmount] = useState('0.001')
    const [limitPrice, setLimitPrice] = useState('')
    const [leverage, setLeverage] = useState(1)
    const [lastAction, setLastAction] = useState<string | null>(null)

    const tick = prices[activeSymbol]
    const shortSym = activeSymbol.replace('USDT', '')
    const currentPrice = tick?.price ?? 0
    const execPrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : currentPrice
    const qty = parseFloat(amount) || 0
    const notional = execPrice * qty
    const required = notional / leverage

    const canTrade = qty > 0 && execPrice > 0 && required <= buyingPower

    const execute = (side: Side) => {
        if (!canTrade) return
        const pos = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            symbol: activeSymbol,
            side,
            entryPrice: execPrice,
            size: qty,
            leverage,
            pnl: 0,
            pnlPct: 0,
            timestamp: Date.now(),
        }
        addPosition(pos)
        setLastAction(`${side === 'long' ? 'Bought' : 'Sold'} ${qty} ${shortSym} @ $${execPrice.toFixed(2)} ×${leverage}`)
        setTimeout(() => setLastAction(null), 4000)
    }

    const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50]

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3 px-4 py-2 items-end overflow-hidden">

                {/* Left: Order type + Price */}
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-1">
                        {(['market', 'limit'] as OrderType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setOrderType(t)}
                                className={`px-3 py-0.5 text-[10px] font-semibold uppercase rounded transition-all
                  ${orderType === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    {orderType === 'limit' && (
                        <div>
                            <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-wider">Limit Price</div>
                            <input
                                type="number"
                                value={limitPrice}
                                onChange={e => setLimitPrice(e.target.value)}
                                placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-white/25 transition-colors"
                            />
                        </div>
                    )}
                    <div>
                        <div className="text-[9px] text-white/30 mb-0.5 uppercase tracking-wider">Amount ({shortSym})</div>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            step="0.001"
                            min="0"
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-white/25 transition-colors"
                        />
                    </div>
                </div>

                {/* Center: Leverage */}
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">Leverage: <span className="text-white font-bold">{leverage}×</span></div>
                    <input
                        type="range"
                        min={1}
                        max={100}
                        value={leverage}
                        onChange={e => setLeverage(Number(e.target.value))}
                        className="w-full accent-white h-1 rounded"
                    />
                    <div className="flex gap-1 flex-wrap">
                        {LEVERAGE_PRESETS.map(l => (
                            <button
                                key={l}
                                onClick={() => setLeverage(l)}
                                className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-all
                  ${leverage === l ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30 hover:text-white/60'}`}
                            >
                                {l}×
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-white/30 mt-0.5">
                        <span>Cost: <span className="text-white/60 font-mono">${required.toFixed(2)}</span></span>
                        <span>Notional: <span className="text-white/60 font-mono">${notional.toFixed(2)}</span></span>
                    </div>
                </div>

                {/* Right: Buy/Sell */}
                <div className="flex flex-col gap-2 min-w-[160px]">
                    <button
                        onClick={() => execute('long')}
                        disabled={!canTrade}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm
              bg-emerald-500 text-black hover:bg-emerald-400 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:shadow-[0_0_24px_rgba(16,185,129,0.5)]"
                    >
                        <TrendingUp size={15} /> Buy/Long
                    </button>
                    <div className="flex items-center justify-center">
                        <span className="text-white/20 text-xs font-bold tracking-widest select-none">/</span>
                    </div>
                    <button
                        onClick={() => execute('short')}
                        disabled={!canTrade}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm
              bg-red-500 text-white hover:bg-red-400 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]"
                    >
                        <TrendingDown size={15} /> Sell/Short
                    </button>
                </div>
            </div>

            {/* Status bar */}
            <div className="h-6 px-4 flex items-center justify-between border-t border-white/[0.04]">
                <span className="text-[9px] text-white/25 font-mono">
                    Buying Power: <span className="text-white/50">${buyingPower.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                    &nbsp;&nbsp;Current: <span className="text-white/50">{tick ? `$${tick.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '---'}</span>
                </span>
                {lastAction && (
                    <span className="text-[9px] text-emerald-400 font-mono animate-pulse">✓ {lastAction}</span>
                )}
            </div>
        </div>
    )
}
