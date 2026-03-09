'use client'

import { useEffect, useState } from 'react'
import { useMarketStore } from '@/state/marketStore'
import { Grid3X3 } from 'lucide-react'

const CORRELATION_DATA = [
    { name: 'BTC', values: [1.00, 0.87, 0.79, 0.21, 0.18] },
    { name: 'ETH', values: [0.87, 1.00, 0.83, 0.19, 0.14] },
    { name: 'SOL', values: [0.79, 0.83, 1.00, 0.16, 0.11] },
    { name: 'NASDAQ', values: [0.21, 0.19, 0.16, 1.00, 0.45] },
    { name: 'GOLD', values: [0.18, 0.14, 0.11, 0.45, 1.00] },
]

const ONCHAIN_METRICS = [
    { label: 'Active Addresses (24H)', value: '1,247,832', change: '+3.2%', positive: true },
    { label: 'Exchange Inflows', value: '24,382 BTC', change: '+12.1%', positive: false },
    { label: 'Exchange Outflows', value: '31,948 BTC', change: '+8.4%', positive: true },
    { label: 'Miner Revenue', value: '$28.4M', change: '+1.9%', positive: true },
    { label: 'Hash Rate', value: '632 EH/s', change: '+0.8%', positive: true },
    { label: 'NUPL', value: '0.54', change: 'Belief phase', positive: true },
    { label: 'MVRV Ratio', value: '2.31', change: 'Fair value zone', positive: true },
    { label: 'Fear & Greed', value: '72 / 100', change: 'Greed', positive: false },
]

function colorForCorr(v: number) {
    if (v >= 0.8) return 'bg-emerald-500/80'
    if (v >= 0.5) return 'bg-emerald-500/40'
    if (v >= 0.2) return 'bg-yellow-500/30'
    if (v >= 0.0) return 'bg-white/10'
    return 'bg-red-500/30'
}

export function OnChainPanel() {
    const [tab, setTab] = useState<'onchain' | 'correlation'>('onchain')

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                <Grid3X3 size={11} className="text-cyan-400" />
                <span className="text-[11px] font-semibold text-white tracking-wide">Analytics</span>
                <div className="ml-auto flex gap-1">
                    {(['onchain', 'correlation'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-2 py-0.5 text-[9px] rounded transition-all capitalize
                ${tab === t ? 'bg-white/10 text-white' : 'text-white/25 hover:text-white/50'}`}
                        >
                            {t === 'onchain' ? 'On-Chain' : 'Correlation'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none">
                {tab === 'onchain' ? (
                    <div className="px-3 py-2 space-y-1.5">
                        {ONCHAIN_METRICS.map(m => (
                            <div key={m.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                                <span className="text-[9px] text-white/35">{m.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-white">{m.value}</span>
                                    <span className={`text-[8px] font-mono ${m.positive ? 'text-emerald-400' : 'text-red-400'}`}>{m.change}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-3 py-3">
                        <div className="text-[9px] text-white/30 mb-3">Market Correlation Matrix (30D)</div>
                        <div className="overflow-x-auto">
                            <table className="text-[9px] font-mono w-full">
                                <thead>
                                    <tr>
                                        <th className="text-white/20 text-left pb-2 pr-2"></th>
                                        {CORRELATION_DATA.map(r => (
                                            <th key={r.name} className="text-white/40 font-normal text-center pb-2 px-1">{r.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {CORRELATION_DATA.map((row, ri) => (
                                        <tr key={row.name}>
                                            <td className="text-white/40 pr-2 py-0.5">{row.name}</td>
                                            {row.values.map((v, ci) => (
                                                <td key={ci} className="px-1 py-0.5 text-center">
                                                    <span className={`inline-block w-8 h-5 rounded flex items-center justify-center text-[8px] font-bold ${colorForCorr(v)}`}
                                                        style={{ fontSize: '8px', lineHeight: '20px' }}>
                                                        {v.toFixed(2)}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
