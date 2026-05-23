'use client'

import { useMarketStore } from '@/state/marketStore'

const WS_BASE = 'wss://stream.binance.com:9443/ws'

const TICKER_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt', 'dogeusdt', 'avaxusdt', 'linkusdt']

// 24hr stats cache from REST so we have baseline change data
const statsCache: Record<string, { change: number; changePct: number; high: number; low: number; volume: number }> = {}

class BinanceSocketManager {
    private sockets: Map<string, WebSocket> = new Map()
    private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
    private isDestroyed = false

    // ── Ticker stream (all symbols combined) ──────────────────────
    connectTicker() {
        const streams = TICKER_SYMBOLS.map(s => `${s}@ticker`).join('/')
        const url = `${WS_BASE}/${streams}`
        this.connect('ticker', url, msg => {
            const d = JSON.parse(msg)
            // combined stream wraps in {stream, data}
            const data = d.data || d
            const symbol = (data.s as string)?.toUpperCase()
            if (!symbol) return
            useMarketStore.getState().setPriceTick(symbol, {
                symbol,
                price: parseFloat(data.c),
                change24h: parseFloat(data.p),
                changePct24h: parseFloat(data.P),
                high24h: parseFloat(data.h),
                low24h: parseFloat(data.l),
                volume24h: parseFloat(data.v),
            })
        })
    }

    // ── Depth (orderbook) stream ──────────────────────────────────
    connectDepth(symbol: string) {
        const url = `${WS_BASE}/${symbol.toLowerCase()}@depth20@100ms`
        this.connect(`depth_${symbol}`, url, msg => {
            const d = JSON.parse(msg)
            useMarketStore.getState().setOrderBook({
                bids: (d.bids || []).slice(0, 18).map((b: string[]) => ({ price: parseFloat(b[0]), qty: parseFloat(b[1]) })),
                asks: (d.asks || []).slice(0, 18).map((a: string[]) => ({ price: parseFloat(a[0]), qty: parseFloat(a[1]) })),
                lastUpdateId: d.lastUpdateId || 0,
            })
        })
    }

    // ── Trades stream ─────────────────────────────────────────────
    connectTrades(symbol: string) {
        const url = `${WS_BASE}/${symbol.toLowerCase()}@trade`
        this.connect(`trade_${symbol}`, url, msg => {
            const d = JSON.parse(msg)
            useMarketStore.getState().addTrade({
                id: d.t,
                price: parseFloat(d.p),
                qty: parseFloat(d.q),
                isBuyerMaker: d.m,
                time: d.T,
            })
        })
    }

    // ── Disconnect old depth/trade streams and reconnect for new symbol ──
    switchSymbol(symbol: string) {
        // Close old depth/trade streams (keep ticker alive)
        for (const key of Array.from(this.sockets.keys())) {
            if (key.startsWith('depth_') || key.startsWith('trade_')) {
                this.disconnect(key)
            }
        }
        // Clear orderbook & trades
        useMarketStore.getState().setOrderBook({ bids: [], asks: [], lastUpdateId: 0 })
        this.connectDepth(symbol)
        this.connectTrades(symbol)
    }

    // ── Core connect with auto-reconnect ─────────────────────────
    private connect(key: string, url: string, onMessage: (msg: string) => void) {
        if (typeof window === 'undefined') return
        if (this.isDestroyed) return
        
        const existing = this.sockets.get(key)
        if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return

        try {
            const ws = new WebSocket(url)
            this.sockets.set(key, ws)

            ws.onmessage = e => onMessage(e.data as string)
            ws.onerror = (e) => {
                console.warn(`[Binance WS Error] ${key}`, e)
                // Let onclose handle the reconnect
            }
            ws.onclose = () => {
                if (!this.isDestroyed) {
                    const timer = setTimeout(() => {
                        this.sockets.delete(key)
                        this.connect(key, url, onMessage)
                    }, 3000)
                    this.reconnectTimers.set(key, timer)
                }
            }
        } catch (err) {
            console.error(`[Binance WS Initialization Error] ${key} - ${url}`, err)
        }
    }

    private disconnect(key: string) {
        const ws = this.sockets.get(key)
        if (ws) { 
            ws.onclose = null
            ws.onerror = null
            ws.onmessage = null
            ws.close()
            this.sockets.delete(key) 
        }
        const timer = this.reconnectTimers.get(key)
        if (timer) { clearTimeout(timer); this.reconnectTimers.delete(key) }
    }

    destroy() {
        this.isDestroyed = true
        for (const key of Array.from(this.sockets.keys())) this.disconnect(key)
        this.reconnectTimers.forEach(t => clearTimeout(t))
    }
}

// Singleton
let manager: BinanceSocketManager | null = null

export function getBinanceManager(): BinanceSocketManager {
    if (!manager) manager = new BinanceSocketManager()
    return manager
}

export function destroyAllSockets() {
    manager?.destroy()
    manager = null
}

export { TICKER_SYMBOLS }
