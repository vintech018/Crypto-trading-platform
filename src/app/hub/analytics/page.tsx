'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Activity, Award, BarChart3, Database } from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'

import { api } from '@/lib/apiClient'

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface PortfolioSnapshot {
  date: string
  totalValue: number
  holdingsValue: number
}

interface DailyPnL {
  date: string
  realisedPnL: number
  buyVolume: number
  sellVolume: number
  tradeCount: number
}

interface AssetPerformance {
  asset: string
  realisedPnL: number
  totalBought: number
  totalSold: number
  buyCount: number
  sellCount: number
}

interface TradingStreak {
  currentStreak: number
  currentStreakType: 'WIN' | 'LOSS' | 'NONE'
  bestWinStreak: number
  worstLossStreak: number
  totalWins: number
  totalLosses: number
  totalTrades: number
}

interface AnalyticsData {
  portfolioHistory: PortfolioSnapshot[]
  dailyPnL: DailyPnL[]
  assets: AssetPerformance[]
  stats: TradingStreak | null
  monthly: unknown[]
}

// ─── Helper Components ──────────────────────────────────────────────────────

function MetricCard({ title, value, sub, colorClass, icon: Icon }: { title: string, value: React.ReactNode, sub?: React.ReactNode, colorClass: string, icon: React.ElementType }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-10 blur-3xl -mr-10 -mt-10 rounded-full group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]`}>
          <Icon size={16} className="text-white/60" />
        </div>
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-2xl font-mono font-bold text-white tracking-tight">{value}</div>
      {sub && <div className="mt-2 text-[12px] text-white/40">{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label, prefix = '$' }: { active?: boolean, payload?: { color: string, name: string, value: string | number }[], label?: string, prefix?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-white/10 p-3 rounded-lg backdrop-blur-xl shadow-2xl">
        <div className="text-[10px] text-white/50 mb-1 font-mono">{new Date(label || '').toLocaleDateString()}</div>
        {payload.map((p, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-white/70">{p.name}:</span>
            <span className="font-mono font-bold text-white">
              {prefix}{Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [mounted, setMounted] = useState(false)

  const fetchAnalytics = () => {
    setLoading(true)
    setError(false)
    api.get<{ data: AnalyticsData }>('/api/analytics/dashboard')
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }

  useEffect(() => {
    setMounted(true)
    fetchAnalytics()
  }, [])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white/50 text-sm font-mono">
        <div className="flex flex-col items-center gap-4">
          <Database size={24} className="animate-pulse text-cyan-400" />
          <span>Querying PostgreSQL Analytics Layer...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white/50 text-sm font-mono">
        <div className="flex flex-col items-center gap-4">
          <Database size={24} className="text-red-400" />
          <div className="text-red-400">
            <span>Failed to load PostgreSQL Analytics</span>
          </div>
          <button 
            onClick={fetchAnalytics}
            className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
          >
            Retry Connection
          </button>
          <Link href="/hub" className="mt-2 text-white/30 hover:text-white/50 underline">
            Return to Hub
          </Link>
        </div>
      </div>
    )
  }

  // Derived metrics
  const totalRealisedPnL = data.assets.reduce((sum, a) => sum + a.realisedPnL, 0)
  const totalVolume = data.assets.reduce((sum, a) => sum + a.totalBought + a.totalSold, 0)
  const winRate = data.stats 
    ? (data.stats.totalTrades > 0 ? (data.stats.totalWins / (data.stats.totalWins + data.stats.totalLosses)) * 100 : 0)
    : 0

  // Format data for charts
  const portfolioData = [...data.portfolioHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const pnlData = [...data.dailyPnL].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Top assets by volume for pie chart
  const topAssetsPie = data.assets
    .sort((a, b) => (b.totalBought + b.totalSold) - (a.totalBought + a.totalSold))
    .slice(0, 5)
    .map((a, i) => ({
      name: a.asset,
      value: a.totalBought + a.totalSold,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i]
    }))

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        html, body { overflow-y: auto; background-color: #000; }
        .analytics-bg {
          background-image:
            radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.05) 0px, transparent 50%);
          min-height: 100vh;
        }
      ` }} />

      <div className="analytics-bg relative" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          
          <Link href="/hub" className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-8">
            <ArrowLeft size={12} /> Back to Hub
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 size={24} className="text-blue-400" />
                <h1 className="text-3xl font-bold text-white tracking-tight">Advanced Analytics</h1>
              </div>
              <p className="text-sm text-white/40 flex items-center gap-2">
                <Database size={14} /> Powered by PostgreSQL secondary reporting layer
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard 
              title="Total Realised P&L" 
              value={<span className={totalRealisedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {totalRealisedPnL >= 0 ? '+' : ''}${Math.abs(totalRealisedPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>}
              icon={Activity}
              colorClass="from-emerald-500 to-transparent"
            />
            <MetricCard 
              title="Total Trading Volume" 
              value={`$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              icon={TrendingUp}
              colorClass="from-blue-500 to-transparent"
            />
            <MetricCard 
              title="Win Rate" 
              value={`${winRate.toFixed(1)}%`}
              sub={<span className="text-white/30">{data.stats?.totalWins || 0}W / {data.stats?.totalLosses || 0}L</span>}
              icon={Award}
              colorClass="from-purple-500 to-transparent"
            />
            <MetricCard 
              title="Best Win Streak" 
              value={`${data.stats?.bestWinStreak || 0} trades`}
              sub={data.stats?.currentStreakType === 'WIN' ? <span className="text-emerald-400">Current: {data.stats.currentStreak} 🔥</span> : 'No active win streak'}
              icon={TrendingUp}
              colorClass="from-amber-500 to-transparent"
            />
          </div>

          {/* Charts Area 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-6">Portfolio Growth (30 Days)</div>
              <div className="h-64 w-full">
                {portfolioData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, {month:'short', day:'numeric'})} stroke="rgba(255,255,255,0.1)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                      <YAxis stroke="rgba(255,255,255,0.1)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="totalValue" name="Portfolio Value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-sm font-mono border border-dashed border-white/10 rounded-xl">No snapshot data available</div>
                )}
              </div>
            </div>
            
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col">
              <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-6">Top Assets by Volume</div>
              <div className="flex-1 flex items-center justify-center relative">
                {topAssetsPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topAssetsPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {topAssetsPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-black/90 border border-white/10 p-2 rounded backdrop-blur-xl">
                                <span className="text-white/70 text-xs">{payload[0].name}: </span>
                                <span className="text-white font-mono text-xs font-bold">${Number(payload[0].value).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                              </div>
                            )
                          }
                          return null
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-white/20 text-sm font-mono">No trades yet</div>
                )}
                {topAssetsPie.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-xs text-white/40">Assets</div>
                      <div className="text-lg font-bold text-white">{topAssetsPie.length}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Area 2 */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 mb-8">
            <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-6">Daily Realised P&L</div>
            <div className="h-64 w-full">
              {pnlData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlData}>
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, {month:'short', day:'numeric'})} stroke="rgba(255,255,255,0.1)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                    <YAxis stroke="rgba(255,255,255,0.1)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<CustomTooltip />} />
                    <Bar dataKey="realisedPnL" name="Net P&L" radius={[4, 4, 0, 0]}>
                      {pnlData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.realisedPnL >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 text-sm font-mono border border-dashed border-white/10 rounded-xl">No trading history</div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="p-6 border-b border-white/[0.05]">
              <div className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Asset Performance Matrix</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                    <th className="px-6 py-4 text-white/40 font-medium text-xs">Asset</th>
                    <th className="px-6 py-4 text-white/40 font-medium text-xs text-right">Trades (B/S)</th>
                    <th className="px-6 py-4 text-white/40 font-medium text-xs text-right">Total Vol</th>
                    <th className="px-6 py-4 text-white/40 font-medium text-xs text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-white/20 font-mono">No data to display</td>
                    </tr>
                  )}
                  {data.assets.map(asset => (
                    <tr key={asset.asset} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{asset.asset}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-white/60">{asset.buyCount + asset.sellCount}</span>
                        <span className="text-white/30 text-xs ml-2">({asset.buyCount}/{asset.sellCount})</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white/80">
                        ${(asset.totalBought + asset.totalSold).toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold">
                        <span className={asset.realisedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {asset.realisedPnL >= 0 ? '+' : ''}${asset.realisedPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
