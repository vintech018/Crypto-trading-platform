import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";

import AIResearchPanel from "../components/AIResearchPanel.jsx";
import MarketTicker from "../components/MarketTicker.jsx";
import NewsPanel from "../components/NewsPanel.jsx";
import PortfolioTracker from "../components/PortfolioTracker.jsx";
import TradingChart from "../components/TradingChart.jsx";
import WhaleAlerts from "../components/WhaleAlerts.jsx";
import { useMarketData } from "../hooks/useMarketData";

/* ─── Live clock ─────────────────────── */
function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(null);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted || !time) {
    return <span className="font-mono text-xs text-slate-600 tabular-nums">--:--:--</span>;
  }

  return (
    <span className="font-mono text-xs text-slate-400 tabular-nums">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      {" "}
      <span className="text-slate-600">UTC{time.toTimeString().slice(9, 15)}</span>
    </span>
  );
}

/* ─── Status bar ─────────────────────── */
function StatusBar({ connectionState }) {
  const statusConfig = {
    connected: { text: "LIVE", dot: "bg-neon-green animate-pulse-dot", textColor: "text-neon-green" },
    reconnecting: { text: "RECONNECTING", dot: "bg-neon-gold animate-pulse-dot", textColor: "text-neon-gold" },
    connecting: { text: "CONNECTING", dot: "bg-neon-blue animate-pulse-dot", textColor: "text-neon-blue" },
    error: { text: "ERROR", dot: "bg-neon-red", textColor: "text-neon-red" },
  };
  const s = statusConfig[connectionState] || statusConfig.connecting;

  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-2.5 backdrop-blur-xl sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-green/15 text-neon-green font-bold text-sm">
            S
          </div>
          <motion.div
            className="absolute -inset-0.5 rounded-lg border border-neon-green/30"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">Solidus</p>
          <p className="text-[10px] text-slate-600 leading-none mt-0.5">Crypto Terminal</p>
        </div>
      </div>

      {/* Center nav hint */}
      <div className="hidden md:flex items-center gap-4">
        {["Dashboard", "Markets", "Portfolio", "Trade"].map((item, i) => (
          <span
            key={item}
            className={`text-xs cursor-pointer transition ${i === 0 ? "text-neon-green font-medium" : "text-slate-500 hover:text-slate-300"
              }`}
          >
            {item}
          </span>
        ))}
      </div>

      {/* Right: clock + status */}
      <div className="flex items-center gap-4">
        <LiveClock />
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          <span className={`text-[10px] font-mono font-medium ${s.textColor}`}>{s.text}</span>
        </div>
      </div>
    </header>
  );
}

/* ─── Section fade wrapper ────────────── */
function FadeSection({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Dashboard ──────────────────────── */
export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1m");

  const {
    prices,
    tickerStats,
    connectionState,
    news,
    whaleAlerts,
    mergedCandles,
    chartLoading,
  } = useMarketData(symbol, timeframe);

  const chartCandles = useMemo(() => mergedCandles.slice(-350), [mergedCandles]);

  return (
    <div className="min-h-screen noise">
      {/* Status bar */}
      <StatusBar connectionState={connectionState} />

      {/* Main content */}
      <main className="mx-auto max-w-[1800px] space-y-4 px-3 py-4 sm:px-4 lg:px-6">

        {/* ── Row 1: Market Ticker ───────────────── */}
        <FadeSection delay={0}>
          <MarketTicker
            prices={prices}
            tickerStats={tickerStats}
            connectionState={connectionState}
          />
        </FadeSection>

        {/* ── Row 2: Chart + Right Rail ─────────── */}
        <FadeSection delay={0.08}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.2fr_1fr]">
            {/* Chart */}
            <TradingChart
              symbol={symbol}
              timeframe={timeframe}
              candles={chartCandles}
              onSymbolChange={setSymbol}
              onTimeframeChange={setTimeframe}
              loading={chartLoading}
              prices={prices}
            />

            {/* Right panel: AI + News stacked */}
            <div className="flex flex-col gap-4">
              <AIResearchPanel />
              <NewsPanel news={news} />
            </div>
          </div>
        </FadeSection>

        {/* ── Row 3: Whale Alerts + Portfolio ───── */}
        <FadeSection delay={0.16}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WhaleAlerts alerts={whaleAlerts} />
            <PortfolioTracker />
          </div>
        </FadeSection>

        {/* Footer */}
        <div className="border-t border-white/5 pt-3 pb-2">
          <p className="text-center text-[10px] text-slate-700 font-mono">
            Solidus Crypto Terminal · Real-time data via WebSocket · Charts by TradingView · {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  );
}
