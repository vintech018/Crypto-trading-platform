'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Zap, ChevronRight, Activity, TrendingUp, RefreshCcw } from 'lucide-react'

interface MarketDigest {
  newsSummary: string
  marketOutlook: {
    timeframe: string
    score: number
    label: string
    text: string
  }[]
  strategies: {
    name: string
    description: string
  }[]
}

// Sleek Horizontal Progress Gauge (Black & White Theme)
const ScoreGauge = ({ score }: { score: number }) => {
  const percentage = (Number(score) / 10) * 100

  return (
    <div className="w-full flex flex-col items-center mt-3 px-2 pb-2">
      {/* Large Minimal Number */}
      <div className="text-4xl font-black tracking-tighter mb-4 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
        {Number(score).toFixed(2)}
      </div>
      
      {/* Animated Track */}
      <div className="relative w-full h-1 bg-white/[0.08] rounded-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        />
        {/* Glowing Orb at the end */}
        <motion.div
          initial={{ left: 0, opacity: 0, scale: 0 }}
          animate={{ left: `${percentage}%`, opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_3px_rgba(255,255,255,0.8)]"
        />
      </div>
    </div>
  )
}

export function MarketDigestPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [digest, setDigest] = useState<MarketDigest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [width, setWidth] = useState(480)
  const isDragging = useRef(false)

  useEffect(() => {
    if (isOpen && !digest && !isLoading) {
      fetchDigest()
    }
  }, [isOpen])

  const fetchDigest = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/digest')
      if (!res.ok) {
        throw new Error('Failed to generate market digest.')
      }
      const data = await res.json()
      setDigest(data)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    const newWidth = document.documentElement.clientWidth - e.clientX
    if (newWidth > 320 && newWidth < 800) {
      setWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // (ScoreGauge moved outside component to prevent re-mounting and flickering)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ width }}
            className="fixed top-0 right-0 h-full bg-[#0d0e12] border-l border-white/[0.08] z-50 overflow-y-auto flex flex-col shadow-2xl"
          >
            {/* Drag Handle */}
            <div 
              onMouseDown={handleMouseDown}
              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/[0.05] transition-colors z-50"
            />

            {/* Header */}
            <div className="sticky top-0 bg-[#0d0e12]/90 backdrop-blur-md px-6 py-5 border-b border-white/[0.08] flex items-start justify-between z-10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Your Market Digest</h2>
                  {lastUpdated && (
                    <div className="text-[11px] text-white/40 mt-0.5 flex items-center gap-1.5">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                      <button onClick={fetchDigest} disabled={isLoading} className="hover:text-white/80 transition-colors">
                        <RefreshCcw size={10} className={isLoading ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {isLoading ? (
                <div className="space-y-8 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-24 bg-white/5 rounded-xl border border-white/[0.05]" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="grid grid-cols-3 gap-3">
                      {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/[0.05]" />)}
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              ) : digest ? (
                <>
                  {/* News Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <Zap size={14} />
                      <h3 className="text-sm font-semibold tracking-wide uppercase">News Summary</h3>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[13px] text-white/70 leading-relaxed">
                      {digest.newsSummary}
                    </div>
                  </div>

                  {/* Market Outlook */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <Activity size={14} />
                      <h3 className="text-sm font-semibold tracking-wide uppercase">Market Outlook</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {digest.marketOutlook.map((outlook, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center text-center hover:bg-white/[0.04] transition-colors">
                          <div className="flex flex-col items-center mb-2">
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">{outlook.timeframe}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.08] text-white/50 mt-1">{outlook.label}</span>
                          </div>
                          <p className="text-[10px] text-white/45 leading-relaxed line-clamp-4 flex-1">
                            {outlook.text}
                          </p>
                          <div className="mt-4">
                            <ScoreGauge score={outlook.score} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategies to Consider */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white">
                      <Sparkles size={14} />
                      <h3 className="text-sm font-semibold tracking-wide uppercase">Strategies to Consider</h3>
                    </div>
                    <div className="space-y-2.5">
                      {digest.strategies.map((strategy, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            onClose()
                            window.location.href = '/terminal'
                          }}
                          className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                              {i === 0 ? <TrendingUp size={14} className="text-white/70 group-hover:text-white" /> : <Activity size={14} className="text-white/70 group-hover:text-white" />}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold text-white group-hover:text-white transition-colors">{strategy.name}</div>
                              <div className="text-[11px] text-white/45 mt-0.5">{strategy.description}</div>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.04] text-[9px] text-white/30 text-center">
                    * AI analysis may contain errors. Please verify information and always DYOR.
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
