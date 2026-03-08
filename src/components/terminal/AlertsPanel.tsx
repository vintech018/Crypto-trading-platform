'use client'

import { useState } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { Bell, Plus, Trash2 } from 'lucide-react'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

export function AlertsPanel() {
    const alerts = useMarketStore(s => s.alerts)
    const addAlert = useMarketStore(s => s.addAlert)
    const removeAlert = useMarketStore(s => s.removeAlert)
    const prices = useMarketStore(s => s.prices)

    const [sym, setSym] = useState('BTCUSDT')
    const [price, setPrice] = useState('')

    const handleAdd = () => {
        if (!price) return
        addAlert({
            id: `${Date.now()}`,
            type: 'price',
            symbol: sym,
            condition: parseFloat(price) > (prices[sym]?.price ?? 0) ? 'above' : 'below',
            value: parseFloat(price),
            triggered: false,
            timestamp: Date.now(),
        })
        setPrice('')
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                <Bell size={11} className="text-yellow-400" />
                <span className="text-[11px] font-semibold text-white tracking-wide">Alerts</span>
            </div>

            {/* Create alert */}
            <div className="px-3 py-2 border-b border-white/[0.04] space-y-1.5">
                <div className="text-[9px] text-white/30 uppercase tracking-wider">Price Alert</div>
                <div className="flex gap-1.5">
                    <select
                        value={sym}
                        onChange={e => setSym(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/70 outline-none"
                    >
                        {SYMBOLS.map(s => <option key={s} value={s}>{s.replace('USDT', '')}/USDT</option>)}
                    </select>
                    <input
                        type="number"
                        placeholder="Target price"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/25"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!price}
                        className="px-2 py-1 bg-white/10 text-white rounded hover:bg-white/20 transition-colors disabled:opacity-30"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </div>

            {/* Alert list */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-3 py-2 space-y-1.5">
                {alerts.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-white/20">No alerts set</div>
                )}
                {alerts.map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <Bell size={9} className="text-yellow-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-bold text-white">{a.symbol.replace('USDT', '')}</div>
                            <div className="text-[8px] text-white/40">Price {a.condition} ${a.value.toLocaleString()}</div>
                        </div>
                        <button onClick={() => removeAlert(a.id)} className="text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 size={10} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Keyboard shortcuts */}
            <div className="px-3 py-2 border-t border-white/[0.04]">
                <div className="text-[8px] text-white/20 uppercase tracking-wider mb-1.5">Keyboard Shortcuts</div>
                <div className="grid grid-cols-2 gap-1">
                    {[['T', 'Trade Panel'], ['C', 'Chart/Coin'], ['F', 'Fullscreen'], ['O', 'Order Book']].map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5">
                            <kbd className="text-[8px] bg-white/10 text-white/50 px-1 py-0.5 rounded font-mono">{k}</kbd>
                            <span className="text-[8px] text-white/25">{v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
