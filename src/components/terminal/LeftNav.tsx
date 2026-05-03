'use client'

import { useMarketStore } from '@/state/marketStore'
import { getBinanceManager } from '@/services/binanceSocket'
import Link from 'next/link'
import {
    LayoutDashboard, TrendingUp, BookOpen, Activity,
    Cpu, Waves, Grid3X3, Bell, Settings, ClipboardList, History, BarChart3
} from 'lucide-react'


const COINS = [
    { sym: 'BTCUSDT', label: 'BTC', color: '#f7931a' },
    { sym: 'ETHUSDT', label: 'ETH', color: '#627eea' },
    { sym: 'SOLUSDT', label: 'SOL', color: '#9945ff' },
    { sym: 'BNBUSDT', label: 'BNB', color: '#f3ba2f' },
    { sym: 'XRPUSDT', label: 'XRP', color: '#00aae4' },
    { sym: 'DOGEUSDT', label: 'DOGE', color: '#c2a633' },
    { sym: 'AVAXUSDT', label: 'AVAX', color: '#e84142' },
    { sym: 'LINKUSDT', label: 'LINK', color: '#2a5ada' },
]

const NAV_ITEMS = [
    { id: 'chart',     icon: LayoutDashboard, label: 'Chart'          },
    { id: 'orderbook', icon: BookOpen,         label: 'Order Book'    },
    { id: 'trades',    icon: Activity,         label: 'Trades'        },
    { id: 'orders',    icon: ClipboardList,    label: 'Open Orders'   },
    { id: 'history',   icon: History,          label: 'Trade History' },
    { id: 'portfolio', icon: TrendingUp,        label: 'Portfolio'    },
    { id: 'ai',        icon: Cpu,              label: 'AI Engine'     },
    { id: 'whale',     icon: Waves,            label: 'Whale Tracker' },
    { id: 'onchain',   icon: Grid3X3,          label: 'On-Chain'      },
    { id: 'alerts',    icon: Bell,             label: 'Alerts'        },
]

export function LeftNav() {
    const activeSymbol = useMarketStore(s => s.activeSymbol)
    const setActiveSymbol = useMarketStore(s => s.setActiveSymbol)
    const prices = useMarketStore(s => s.prices)
    const activePanel = useMarketStore(s => s.activePanel)
    const setActivePanel = useMarketStore(s => s.setActivePanel)

    const switchCoin = (sym: string) => {
        setActiveSymbol(sym)
        getBinanceManager().switchSymbol(sym)
    }

    return (
        <div className="w-[72px] h-full flex flex-col bg-black border-r border-white/[0.06] z-40">
            {/* Logo — clicks back to Hub */}
            <div className="h-12 flex items-center justify-center border-b border-white/[0.06]">
                <Link href="/hub" title="Back to Hub">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center cursor-pointer hover:bg-white/90 transition-colors">
                        <span className="text-black text-xs font-black">S</span>
                    </div>
                </Link>
            </div>

            {/* Nav Items */}
            <div className="flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto scrollbar-none">
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActivePanel(item.id)}
                        title={item.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative
              ${activePanel === item.id
                                ? 'bg-white/10 text-white'
                                : 'text-white/30 hover:text-white/70 hover:bg-white/5'
                            }`}
                    >
                        <item.icon size={16} />
                        {activePanel === item.id && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />
                        )}
                        {/* Tooltip */}
                        <span className="absolute left-full ml-2 px-2 py-1 bg-[#111] border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            {item.label}
                        </span>
                    </button>
                ))}

                <div className="w-8 h-px bg-white/10 my-2" />

                {/* Coin shortcuts */}
                {COINS.map(c => {
                    const tick = prices[c.sym]
                    const isUp = (tick?.changePct24h ?? 0) >= 0
                    return (
                        <button
                            key={c.sym}
                            onClick={() => switchCoin(c.sym)}
                            title={`${c.label} ${tick ? `$${tick.price.toFixed(2)}` : ''}`}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all relative group
                ${activeSymbol === c.sym ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}`}
                        >
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] font-bold" style={{ color: c.color }}>{c.label}</span>
                                {tick && (
                                    <span className={`text-[8px] font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isUp ? '▲' : '▼'}
                                    </span>
                                )}
                            </div>
                            {activeSymbol === c.sym && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: c.color }} />
                            )}
                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 px-2 py-1.5 bg-[#111] border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <div className="font-bold">{c.label}/USDT</div>
                                {tick && <div className="text-white/50">${tick.price.toFixed(2)}</div>}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Settings → Reports */}
            <div className="pb-3 flex flex-col items-center gap-1.5">
                <Link href="/reports" title="Trade Reports" className="w-10 h-10 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 transition-all group relative">
                    <BarChart3 size={15} />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#111] border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Trade Reports</span>
                </Link>
                <Link href="/hub" title="Settings" className="w-10 h-10 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all">
                    <Settings size={15} />
                </Link>
            </div>
        </div>
    )
}
