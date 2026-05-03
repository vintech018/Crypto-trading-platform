'use client'

import { useState } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { setPositionLines } from './PositionLines'
import { api, ApiResponse, auth } from '@/lib/apiClient'

type OrderType = 'market' | 'limit'
type Side = 'long' | 'short'

// Map Binance pair names → coin ticker (used by backend)
function pairToCoin(symbol: string): string {
    // Strip only the quote currency suffix (USDT, BUSD, etc.)
    // Do NOT strip BTC — it may be the base coin itself (e.g. BTCUSDT → BTC)
    return symbol.replace(/(?:USDT|BUSD|USDC|TUSD|USD)$/i, '')
}

interface TradeResponse {
    trade: {
        _id: string
        coin: string
        type: string
        quantity: number
        price: number
        totalValue: number
    }
    realisedPnL?: number
    walletBalance?: number
}

interface OrderResponse {
    order: {
        id: string
        status: string
        filledQty: number
        remainingQty: number
    }
    fills: { fillQty: number; fillPrice: number }[]
}

export function TradeExecution() {
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const prices = useMarketStore(s => s.prices)
    const buyingPower = useMarketStore(s => s.buyingPower)
    const holdings = useMarketStore(s => s.holdings)
    const addPosition = useMarketStore(s => s.addPosition)
    const loadWalletFromBackend = useMarketStore(s => s.loadWalletFromBackend)
    const addHoldingFromTrade = useMarketStore(s => s.addHoldingFromTrade)

    const [orderType, setOrderType] = useState<OrderType>('market')
    const [amount, setAmount] = useState('0.001')
    const [limitPrice, setLimitPrice] = useState('')
    const [leverage, setLeverage] = useState(1)
    const [lastAction, setLastAction] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const tick = prices[activeSymbol]
    const shortSym = activeSymbol.replace('USDT', '')
    const coin = pairToCoin(activeSymbol)
    const currentPrice = tick?.price ?? 0
    const execPrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : currentPrice
    const qty = parseFloat(amount) || 0
    const notional = execPrice * qty
    const required = notional / leverage

    const isLoggedIn = auth.isLoggedIn()

    // For market orders: allow trade as long as qty > 0 and buyingPower > 0.
    // execPrice will be 0 if Binance feed hasn't connected yet; we block with
    // a clear error message inside execute() rather than silently disabling the button.
    const priceAvailable = execPrice > 0
    const holdingQty = holdings.find(h => h.coin === coin)?.quantity || 0
    const canBuy = qty > 0 && required <= buyingPower && !isSubmitting
    const canSell = qty > 0 && qty <= holdingQty && !isSubmitting

    const execute = async (side: Side) => {
        console.log('[Solidus Trade] === EXECUTE START ===', {
            side, canBuy, canSell, priceAvailable, isLoggedIn, orderType,
            qty, execPrice, required, buyingPower, holdingQty, isSubmitting,
        })
        if (side === 'long' && !canBuy) {
            console.log('[Solidus Trade] BLOCKED by canBuy=false', { qty, required, buyingPower, isSubmitting })
            return
        }
        if (side === 'short' && !canSell) {
            console.log('[Solidus Trade] BLOCKED by canSell=false', { qty, holdingQty, isSubmitting })
            return
        }

        // Guard: live price must be available before executing a market order
        if (!priceAvailable && orderType === 'market') {
            console.log('[Solidus Trade] BLOCKED by priceAvailable=false')
            setError('Waiting for live price feed... try again in a moment')
            setTimeout(() => setError(null), 4000)
            return
        }

        setIsSubmitting(true)
        setError(null)

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

        // Always add to local positions for the chart lines
        addPosition(pos)
        setPositionLines({ open: execPrice, close: execPrice, side })

        const action = `${side === 'long' ? 'Bought' : 'Sold'} ${qty} ${shortSym} @ $${execPrice.toFixed(2)} ×${leverage}`
        setLastAction(action)
        setTimeout(() => setLastAction(null), 4000)

        // ── Sync to backend if logged in ──────────────────────
        console.log('[Solidus Trade] isLoggedIn check:', isLoggedIn)
        if (isLoggedIn) {
            try {
                if (orderType === 'limit' && limitPrice) {
                    console.log('[Solidus Trade] Sending LIMIT order to /api/orders')
                    // ── LIMIT ORDER → matching engine ──────────────────
                    const res = await api.post<ApiResponse<OrderResponse>>('/api/orders', {
                        coin,
                        type:     side === 'long' ? 'BUY' : 'SELL',
                        price:    execPrice,
                        quantity: qty,
                    })
                    console.log('[Solidus Trade] LIMIT response:', res)
                    const fills = res.data?.fills ?? []
                    const ord   = res.data?.order
                    if (fills.length > 0) {
                        setLastAction(`✓ Limit filled: ${fills.length} fill(s)`)
                        addHoldingFromTrade(coin, qty, execPrice, side === 'long' ? 'buy' : 'sell')
                        await loadWalletFromBackend()
                        useMarketStore.getState().triggerTradeSync()
                    } else {
                        setLastAction(`📋 Order resting in book (${ord?.status ?? 'OPEN'})`)
                        addHoldingFromTrade(coin, qty, execPrice, side === 'long' ? 'buy' : 'sell')
                        await loadWalletFromBackend()
                        useMarketStore.getState().triggerTradeSync()
                    }
                } else {
                    // ── MARKET ORDER → instant execution ───────────────
                    const endpoint = side === 'long' ? '/api/trade/buy' : '/api/trade/sell'
                    console.log('[Solidus Trade] Sending MARKET order to', endpoint, { coin, quantity: qty, price: execPrice })
                    const tradeRes = await api.post<ApiResponse<TradeResponse>>(endpoint, {
                        coin,
                        quantity: qty,
                        price: execPrice,
                    })
                    console.log('[Solidus Trade] MARKET response:', tradeRes)
                    addHoldingFromTrade(coin, qty, execPrice, side === 'long' ? 'buy' : 'sell')
                    await loadWalletFromBackend()
                    useMarketStore.getState().triggerTradeSync()
                }
            } catch (err: unknown) {
                console.error('[Solidus Trade] ERROR:', err)
                const msg = err instanceof Error ? err.message : 'Trade failed on server'
                useMarketStore.getState().triggerTradeSync()
                setError(msg)
                setTimeout(() => setError(null), 6000)
                
                try {
                    // REVERT the optimistic local position to prevent state desync
                    const closePosition = useMarketStore.getState().closePosition
                    closePosition(pos.id)
                } catch(e) {}
                setLastAction(null)
            } finally {
                setIsSubmitting(false)
            }
        } else {
            console.log('[Solidus Trade] GUEST MODE — skipping backend sync')
            setIsSubmitting(false)
        }

    }

    const LEVERAGE_PRESETS = [1, 2, 5, 10]

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
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">
                        Leverage: <b className="text-white font-bold not-italic">{leverage}×</b>
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={10}
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
                        <div>Cost: <b className="text-white/60 font-mono not-italic">${required.toFixed(2)}</b></div>
                        <div>Notional: <b className="text-white/60 font-mono not-italic">${notional.toFixed(2)}</b></div>
                    </div>
                </div>

                {/* Right: Buy/Sell */}
                <div className="flex flex-col gap-2 min-w-[160px]">
                    <button
                        onClick={() => execute('long')}
                        disabled={!canBuy}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm
              bg-emerald-500 text-black hover:bg-emerald-400 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:shadow-[0_0_24px_rgba(16,185,129,0.5)]"
                    >
                        <TrendingUp size={15} /> {isSubmitting ? 'Executing…' : 'Buy'}
                    </button>
                    <div className="flex items-center justify-center">
                        <span className="text-white/20 text-xs font-bold tracking-widest select-none">/</span>
                    </div>
                    <button
                        onClick={() => execute('short')}
                        disabled={!canSell}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm
              bg-red-500 text-white hover:bg-red-400 transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]"
                    >
                        <TrendingDown size={15} /> {isSubmitting ? 'Executing…' : 'Sell'}
                    </button>
                </div>
            </div>

            {/* Status bar */}
            <div className="h-6 px-4 flex items-center justify-between border-t border-white/[0.04]">
                <div className="text-[9px] text-white/25 font-mono flex items-center gap-2">
                    <span>Buying Power: <b className="text-white/50 not-italic">${buyingPower.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>
                    <span>Current: <b className={`not-italic ${priceAvailable ? 'text-white/50' : 'text-yellow-400/50'}`}>
                        {tick ? `$${tick.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'Connecting…'}
                    </b></span>
                    {!isLoggedIn && <span className="text-yellow-400/60">(guest mode — trades not saved)</span>}
                </div>
                {error && (
                    <span className="text-[9px] text-red-400 font-mono">✗ {error}</span>
                )}
                {lastAction && !error && (
                    <span className="text-[9px] text-emerald-400 font-mono animate-pulse">✓ {lastAction}</span>
                )}
            </div>
        </div>
    )
}
