import { create } from 'zustand'

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
}

const INITIAL_EQUITY = 50000
const INITIAL_BUYING_POWER = 150000

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

    addPosition: pos => {
        const cost = (pos.entryPrice * pos.size) / pos.leverage
        set(state => {
            const newBuyingPower = state.buyingPower - cost * pos.leverage
            const newMarginUsed = state.marginUsed + cost
            const newPositions = [...state.positions, pos]
            return {
                positions: newPositions,
                buyingPower: Math.max(0, newBuyingPower),
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
