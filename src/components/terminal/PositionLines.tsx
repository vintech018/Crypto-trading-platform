'use client'

/**
 * PositionLines.tsx
 *
 * Canvas overlay drawn on top of the TradingView chart iframe.
 * Renders permanent ENTRY and EXIT horizontal lines + zone fill
 * for every trade — never behind candles, never touches existing code.
 *
 * Exports (used by TradeExecution + PortfolioPanel):
 *   setEntryLine(price, side)               → called on order submit
 *   setExitLine(exitPrice, entryPrice, side) → called on position close
 *
 * window.__positionLines is always kept in sync for the AI bot.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useMarketStore } from '@/state/marketStore'

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface PositionLineState {
    open:  number
    close: number
    side:  'long' | 'short'
}

// ─── Internal Data ────────────────────────────────────────────────────────────

interface ActiveEntry {
    price: number
    side:  'long' | 'short'
}

interface CompletedTrade {
    id:         string
    entryPrice: number
    exitPrice:  number
    side:       'long' | 'short'
    pnlPct:     number
    isProfit:   boolean
}

let _active: ActiveEntry | null  = null
let _trades: CompletedTrade[]    = []

// ─── Public API ───────────────────────────────────────────────────────────────

/** Call immediately after an order is submitted — places ENTRY line. */
export function setEntryLine(price: number, side: 'long' | 'short') {
    _active = { price, side }
    _syncGlobal()
}

/** Call when a position closes — places EXIT line + zone fill. */
export function setExitLine(
    exitPrice:  number,
    entryPrice: number,
    side:       'long' | 'short',
) {
    const pnlPct = side === 'long'
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100

    _trades = [
        ..._trades,
        {
            id:         `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            entryPrice,
            exitPrice,
            side,
            pnlPct,
            isProfit: pnlPct >= 0,
        },
    ]
    _active = null
    _syncGlobal()
}

// ─── Backward-compat shims (existing wiring in TradeExecution + PortfolioPanel) ─

/** @deprecated prefer setEntryLine */
export function setPositionLines(state: PositionLineState) {
    setEntryLine(state.open, state.side)
}

/** @deprecated prefer setExitLine */
export function closePositionLines(closePrice: number) {
    if (!_active) return
    setExitLine(closePrice, _active.price, _active.side)
}

/** @deprecated */
export function clearPositionLines() {
    _active = null
    _syncGlobal()
}

/** @deprecated no-op — live tracking removed per spec */
export function updatePositionClosePrice(_price: number) { /* no-op */ }

function _syncGlobal() {
    if (typeof window === 'undefined') return
    // @ts-ignore — intentional global for AI bot
    window.__positionLines = _active
        ? { open: _active.price, close: _active.price, side: _active.side }
        : null
}

// ─── Canvas Constants ─────────────────────────────────────────────────────────

const C_LONG       = '#26a69a'
const C_SHORT      = '#ef5350'
const C_PROFIT     = '#26a69a'
const C_LOSS       = '#ef5350'
const FILL_PROFIT  = 'rgba(38,166,154,0.06)'
const FILL_LOSS    = 'rgba(239,83,80,0.06)'
const DASH_SOLID: number[] = []
const DASH_EXIT    = [6, 3]
const LINE_W       = 1.5
const LABEL_FONT   = '11px "Space Grotesk","Inter",monospace'
const LABEL_PAD    = 7
const PILL_H       = 16

// Visible price window — TradingView default zoom shows ~±3% for crypto
const WINDOW_PCT = 0.030

// ─── Component ────────────────────────────────────────────────────────────────

export function PositionLines() {
    const canvasRef    = useRef<HTMLCanvasElement>(null)
    const rafRef       = useRef<number | null>(null)
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const prices       = useMarketStore(s => s.prices)
    const currentPrice = prices[activeSymbol]?.price ?? 0

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }
        const ctx = canvas.getContext('2d')
        if (!ctx)  { rafRef.current = requestAnimationFrame(draw); return }

        // Sync canvas resolution with CSS layout size
        const { offsetWidth: W, offsetHeight: H } = canvas
        if (canvas.width !== W || canvas.height !== H) {
            canvas.width  = W
            canvas.height = H
        }

        ctx.clearRect(0, 0, W, H)

        if (currentPrice <= 0 || W === 0 || H === 0) {
            rafRef.current = requestAnimationFrame(draw)
            return
        }

        // Price ─► canvas Y   (higher price = lower Y)
        const lo    = currentPrice * (1 - WINDOW_PCT)
        const hi    = currentPrice * (1 + WINDOW_PCT)
        const range = hi - lo
        const toY   = (p: number) => H - ((p - lo) / range) * H

        // Layer 1 — completed trade zones (drawn first, underneath lines)
        for (const t of _trades) _drawTrade(ctx, t, toY, W, H)

        // Layer 2 — active entry line (stays until position closes)
        if (_active) {
            _hLine(
                ctx,
                toY(_active.price),
                W,
                _active.side === 'long' ? C_LONG : C_SHORT,
                DASH_SOLID,
                LINE_W,
                `ENTRY  $${_fmt(_active.price)}`,
            )
        }

        rafRef.current = requestAnimationFrame(draw)
    }, [currentPrice, activeSymbol])

    useEffect(() => {
        rafRef.current = requestAnimationFrame(draw)
        return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
    }, [draw])

    useEffect(() => {
        const el = canvasRef.current
        if (!el) return
        const ro = new ResizeObserver(() => { /* size resynced in draw */ })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position:      'absolute',
                inset:         0,
                width:         '100%',
                height:        '100%',
                pointerEvents: 'none',  // all chart mouse events pass through
                zIndex:        10,      // above TradingView iframe, below React UI
            }}
        />
    )
}

// ─── Draw: completed trade (zone fill + entry line + exit line) ───────────────

function _drawTrade(
    ctx:   CanvasRenderingContext2D,
    trade: CompletedTrade,
    toY:   (p: number) => number,
    W:     number,
    H:     number,
) {
    const entryY = toY(trade.entryPrice)
    const exitY  = toY(trade.exitPrice)
    const topY   = Math.min(entryY, exitY)
    const botY   = Math.max(entryY, exitY)
    const color  = trade.isProfit ? C_PROFIT : C_LOSS

    ctx.save()

    // Zone fill between entry and exit
    const cTop = Math.max(0, topY)
    const cBot = Math.min(H, botY)
    if (cBot > cTop) {
        ctx.globalAlpha = 1
        ctx.fillStyle   = trade.isProfit ? FILL_PROFIT : FILL_LOSS
        ctx.fillRect(0, cTop, W, cBot - cTop)
    }

    // Entry line — solid
    _hLine(ctx, entryY, W, color, DASH_SOLID, LINE_W, `ENTRY  $${_fmt(trade.entryPrice)}`)

    // Exit line — dashed + PnL %
    const sign   = trade.pnlPct >= 0 ? '+' : ''
    const pctStr = `${sign}${trade.pnlPct.toFixed(2)}%`
    _hLine(ctx, exitY, W, color, DASH_EXIT, LINE_W, `EXIT  $${_fmt(trade.exitPrice)}  (${pctStr})`)

    ctx.restore()
}

// ─── Draw: single horizontal line with right-edge label pill ─────────────────

function _hLine(
    ctx:   CanvasRenderingContext2D,
    y:     number,
    W:     number,
    color: string,
    dash:  number[],
    lw:    number,
    label: string,
) {
    if (y < 0 || y > ctx.canvas.height) return
    ctx.save()

    // Line
    ctx.beginPath()
    ctx.setLineDash(dash)
    ctx.strokeStyle = color
    ctx.lineWidth   = lw
    ctx.globalAlpha = 0.85
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()

    // Label pill
    ctx.setLineDash([])
    ctx.font         = LABEL_FONT
    ctx.textBaseline = 'middle'
    const tw    = ctx.measureText(label).width
    const pillW = tw + LABEL_PAD * 2
    const pillX = W - pillW - 4
    const pillY = y - PILL_H / 2

    ctx.globalAlpha = 0.93
    ctx.fillStyle   = color
    ctx.beginPath()
    if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillW, PILL_H, 3)
    } else {
        ctx.rect(pillX, pillY, pillW, PILL_H)
    }
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.fillStyle   = '#ffffff'
    ctx.fillText(label, pillX + LABEL_PAD, y)

    ctx.restore()
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function _fmt(p: number): string {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
