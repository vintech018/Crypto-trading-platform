import { create } from 'zustand'
import { api, ApiResponse } from '@/lib/apiClient'
import type { Socket } from 'socket.io-client'

export interface PriceTick {
    symbol: string
    price: number
    change24h: number
    changePct24h: number
    high24h: number
    low24h: number
    volume24h: number
    prevPrice?: number
}

export interface OrderBookEntry {
    price: number
    qty: number
}

export interface OrderBook {
    bids: OrderBookEntry[]
    asks: OrderBookEntry[]
    lastUpdateId: number
}

export interface Trade {
    id: number
    price: number
    qty: number
    isBuyerMaker: boolean
    time: number
}

export interface Position {
    id: string
    symbol: string
    side: 'long' | 'short'
    entryPrice: number
    size: number
    leverage: number
    pnl: number
    pnlPct: number
    timestamp: number
}

export interface PortfolioSnapshot {
    time: number
    equity: number
}

export interface Alert {
    id: string
    type: 'price' | 'volume' | 'whale'
    symbol: string
    condition: string
    value: number
    triggered: boolean
    timestamp: number
}

// ── Backend holding shape ─────────────────────────────────────
export interface BackendHolding {
    coin: string
    quantity: number
    avgBuyPrice: number
    currentPrice: number
    currentValue: number
    unrealisedPnL: number
    pnlPercent: number
}

interface MarketStore {
    // Prices
    prices: Record<string, PriceTick>
    setPriceTick: (symbol: string, tick: PriceTick) => void

    // Orderbook
    orderBook: OrderBook
    setOrderBook: (ob: OrderBook) => void

    // Trades
    recentTrades: Trade[]
    addTrade: (trade: Trade) => void

    // Active symbol
    activeSymbol: string
    setActiveSymbol: (symbol: string) => void

    // Chart mode
    chartMode: 'single' | 'quad'
    setChartMode: (mode: 'single' | 'quad') => void

    // Portfolio
    equity: number
    buyingPower: number
    marginUsed: number
    positions: Position[]
    portfolioHistory: PortfolioSnapshot[]
    addPosition: (pos: Position) => void
    closePosition: (id: string) => void
    updateEquity: () => void

    // Backend holdings (real crypto positions from DB)
    holdings: BackendHolding[]
    walletBalance: number
    totalPortfolioValue: number

    // Sync actions
    isLoadingWallet: boolean
    loadWalletFromBackend: () => Promise<void>
    addHoldingFromTrade: (coin: string, quantity: number, price: number, type: 'buy' | 'sell') => void
    tradeSyncId: number
    triggerTradeSync: () => void

    // Alerts
    alerts: Alert[]
    addAlert: (alert: Alert) => void
    removeAlert: (id: string) => void

    // UI state
    activePanel: string
    setActivePanel: (panel: string) => void

    // Keyboard shortcut focus
    focusPanel: string | null
    setFocusPanel: (panel: string | null) => void

    // Auth-aware init
    isInitialized: boolean
    socket: Socket | null
    initFromBackend: () => Promise<void>
}

const INITIAL_EQUITY = 100000
const INITIAL_BUYING_POWER = 100000

export const useMarketStore = create<MarketStore>((set, get) => ({
    prices: {},
    setPriceTick: (symbol, tick) =>
        set(state => ({
            prices: {
                ...state.prices,
                [symbol]: {
                    ...tick,
                    prevPrice: state.prices[symbol]?.price,
                },
            },
        })),

    orderBook: { bids: [], asks: [], lastUpdateId: 0 },
    setOrderBook: ob => set({ orderBook: ob }),

    recentTrades: [],
    addTrade: trade =>
        set(state => ({
            recentTrades: [trade, ...state.recentTrades].slice(0, 80),
        })),

    activeSymbol: 'BTCUSDT',
    setActiveSymbol: sym => set({ activeSymbol: sym }),

    chartMode: 'single',
    setChartMode: mode => set({ chartMode: mode }),

    equity: INITIAL_EQUITY,
    buyingPower: INITIAL_BUYING_POWER,
    marginUsed: 0,
    positions: [],
    portfolioHistory: [{ time: Date.now(), equity: INITIAL_EQUITY }],

    // Backend state
    holdings: [],
    walletBalance: INITIAL_EQUITY,
    totalPortfolioValue: INITIAL_EQUITY,
    isInitialized: false,
    isLoadingWallet: false,
    socket: null,
    tradeSyncId: 0,
    triggerTradeSync: () => set(state => ({ tradeSyncId: state.tradeSyncId + 1 })),

    // ── Load wallet + portfolio from backend ──────────────────
    loadWalletFromBackend: async () => {
        set({ isLoadingWallet: true })
        try {
            const [walletRes, portfolioRes] = await Promise.all([
                api.get<ApiResponse<{ balance: number; updatedAt: string }>>('/api/wallet/balance'),
                api.get<ApiResponse<{
                    walletBalance: number
                    holdings: BackendHolding[]
                    totalUnrealisedPnL: number
                    totalHoldingsValue: number
                    totalPortfolioValue: number
                }>>('/api/user/portfolio'),
            ])

            const walletBalance = walletRes.data?.balance ?? get().walletBalance
            const portfolio = portfolioRes.data

            set({
                walletBalance,
                buyingPower: walletBalance,   // buying power = cash balance
                equity: walletBalance + (portfolio?.totalHoldingsValue ?? 0),
                holdings: portfolio?.holdings ?? get().holdings,
                totalPortfolioValue: portfolio?.totalPortfolioValue ?? walletBalance,
            })
        } catch (err) {
            console.error('[Solidus] Critical error loading wallet from backend:', err)
            // Do not wipe out wallet state on failure, just leave it as is.
            // A toast or UI alert can be shown if needed, but don't reset to 0.
        } finally {
            set({ isLoadingWallet: false })
        }
    },

    // ── Full init (called on app load after auth) ─────────────
    initFromBackend: async () => {
        if (get().isInitialized) return
        set({ isInitialized: true })

        try {
            await get().loadWalletFromBackend()
        } catch (e) {
            // Reset init flag so it can be retried
            set({ isInitialized: false })
            return
        }

        // Only run socket.io in the browser (dynamic import = no SSR crash)
        if (typeof window === 'undefined') return

        const { io } = await import('socket.io-client')
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050', {
            withCredentials: true,
        })

        socket.on('trade:update', (data) => {
            if (data.portfolio) {
                set({
                    walletBalance: data.portfolio.walletBalance,
                    buyingPower: data.portfolio.walletBalance,
                    equity: data.portfolio.walletBalance + (data.portfolio.totalHoldingsValue ?? 0),
                    holdings: data.portfolio.holdings ?? [],
                    totalPortfolioValue: data.portfolio.totalPortfolioValue ?? data.portfolio.walletBalance,
                })
            }
            get().triggerTradeSync()
        })

        set({ socket })
    },

    // ── Optimistic portfolio update after trade ───────────────
    addHoldingFromTrade: (coin, quantity, price, type) => {
        set(state => {
            const existing = state.holdings.find(h => h.coin === coin)
            let newHoldings: BackendHolding[]

            if (type === 'buy') {
                if (existing) {
                    const newQty = existing.quantity + quantity
                    const newAvg = (existing.avgBuyPrice * existing.quantity + price * quantity) / newQty
                    newHoldings = state.holdings.map(h =>
                        h.coin === coin
                            ? { ...h, quantity: newQty, avgBuyPrice: newAvg, currentPrice: price, currentValue: newQty * price }
                            : h
                    )
                } else {
                    newHoldings = [
                        ...state.holdings,
                        {
                            coin,
                            quantity,
                            avgBuyPrice: price,
                            currentPrice: price,
                            currentValue: quantity * price,
                            unrealisedPnL: 0,
                            pnlPercent: 0,
                        },
                    ]
                }
                const spent = quantity * price
                return {
                    holdings: newHoldings,
                    walletBalance: Math.max(0, state.walletBalance - spent),
                    buyingPower: Math.max(0, state.buyingPower - spent),
                }
            } else {
                // sell
                newHoldings = state.holdings
                    .map(h => {
                        if (h.coin !== coin) return h
                        const newQty = Math.max(0, h.quantity - quantity)
                        return newQty > 0 ? { ...h, quantity: newQty, currentValue: newQty * price } : null
                    })
                    .filter(Boolean) as BackendHolding[]

                const received = quantity * price
                return {
                    holdings: newHoldings,
                    walletBalance: state.walletBalance + received,
                    buyingPower: state.buyingPower + received,
                }
            }
        })
    },

    addPosition: pos => {
        const cost = (pos.entryPrice * pos.size) / pos.leverage
        set(state => {
            const newMarginUsed = state.marginUsed + cost
            const newPositions = [...state.positions, pos]
            return {
                positions: newPositions,
                marginUsed: newMarginUsed,
            }
        })
    },

    closePosition: id => {
        const { positions } = get()
        const pos = positions.find(p => p.id === id)
        if (!pos) return
        const freed = (pos.entryPrice * pos.size) / pos.leverage
        set(state => {
            const newEquity = state.equity + pos.pnl
            const newHistory = [
                ...state.portfolioHistory,
                { time: Date.now(), equity: newEquity },
            ].slice(-100)
            return {
                positions: state.positions.filter(p => p.id !== id),
                equity: newEquity,
                buyingPower: state.buyingPower + freed,
                marginUsed: Math.max(0, state.marginUsed - freed),
                portfolioHistory: newHistory,
            }
        })
    },

    updateEquity: () => {
        const { positions, prices, equity } = get()
        let totalUnrealizedPnl = 0
        positions.forEach(pos => {
            const current = prices[pos.symbol]?.price
            if (current) {
                const pnl =
                    pos.side === 'long'
                        ? (current - pos.entryPrice) * pos.size * pos.leverage
                        : (pos.entryPrice - current) * pos.size * pos.leverage
                totalUnrealizedPnl += pnl
            }
        })
    },

    alerts: [],
    addAlert: alert => set(state => ({ alerts: [...state.alerts, alert] })),
    removeAlert: id =>
        set(state => ({ alerts: state.alerts.filter(a => a.id !== id) })),

    activePanel: 'chart',
    setActivePanel: panel => set({ activePanel: panel }),

    focusPanel: null,
    setFocusPanel: panel => set({ focusPanel: panel }),
}))
