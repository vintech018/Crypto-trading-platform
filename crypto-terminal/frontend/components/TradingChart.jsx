import { CandlestickSeries, createChart } from "lightweight-charts";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const TIMEFRAMES = ["1m", "5m", "1h", "1d"];

const COIN_META = {
  BTCUSDT: { label: "BTC / USDT", icon: "₿", accent: "#f0b429" },
  ETHUSDT: { label: "ETH / USDT", icon: "Ξ", accent: "#a78bfa" },
  SOLUSDT: { label: "SOL / USDT", icon: "◎", accent: "#38bdf8" },
};

function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-[#040812]/80">
      <div className="h-3 w-32 rounded shimmer" />
      <div className="h-2 w-20 rounded shimmer" />
      <p className="text-[11px] text-slate-500 mt-2">Loading history…</p>
    </div>
  );
}

export default function TradingChart({
  symbol,
  timeframe,
  candles,
  onSymbolChange,
  onTimeframeChange,
  loading,
  prices,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const frameRef = useRef(null);
  const queuedCandleRef = useRef(null);
  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  const meta = COIN_META[symbol] || { label: symbol, icon: "●", accent: "#00e895" };
  const livePrice = prices?.[symbol]?.price;
  const liveDirection = prices?.[symbol]?.direction;

  /* ─── Chart init ─────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#64748b",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.07)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.07)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(0,232,149,0.4)", labelBackgroundColor: "#00e895" },
        horzLine: { color: "rgba(0,232,149,0.4)", labelBackgroundColor: "#00e895" },
      },
      handleScroll: true,
      handleScale: true,
    });

    /* lightweight-charts v5: use addSeries(CandlestickSeries, options) */
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00e895",
      downColor: "#ff4d6d",
      wickUpColor: "#00e895",
      wickDownColor: "#ff4d6d",
      borderVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      chart.remove();
    };
  }, []);

  /* ─── Reset data on symbol / timeframe change ── */
  useEffect(() => {
    if (!seriesRef.current || loading) return;
    if (candlesRef.current.length) {
      seriesRef.current.setData(candlesRef.current);
      chartRef.current?.timeScale().fitContent();
    }
  }, [symbol, timeframe, loading]);

  /* ─── Live candle update via rAF ───────────────── */
  const latestCandle = useMemo(
    () => (candles.length ? candles[candles.length - 1] : null),
    [candles]
  );

  useEffect(() => {
    if (!seriesRef.current || !latestCandle || loading) return;
    queuedCandleRef.current = latestCandle;
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        if (queuedCandleRef.current && seriesRef.current) {
          seriesRef.current.update(queuedCandleRef.current);
        }
        frameRef.current = null;
      });
    }
  }, [latestCandle, loading]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card overflow-hidden flex flex-col"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${meta.accent}0a, transparent)` }}
      >
        {/* Coin info + live price */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold"
            style={{ background: `${meta.accent}15`, color: meta.accent }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">{meta.label}</p>
            <div className="mt-1 flex items-center gap-2">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={livePrice}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className={`font-mono text-sm font-medium tabular-nums ${liveDirection === "down" ? "text-neon-red" : "text-neon-green"
                    }`}
                >
                  ${Number(livePrice || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </motion.span>
              </AnimatePresence>
              <span
                className={`text-[10px] rounded px-1.5 py-0.5 font-mono ${liveDirection === "down"
                    ? "bg-neon-red/10 text-neon-red"
                    : "bg-neon-green/10 text-neon-green"
                  }`}
              >
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Coin selector */}
          <div className="flex gap-1 rounded-lg border border-white/[0.07] bg-black/30 p-1">
            {SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => onSymbolChange(sym)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${symbol === sym
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {sym.replace("USDT", "")}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-1 rounded-lg border border-white/[0.07] bg-black/30 p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`relative rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-all duration-200 ${timeframe === tf ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {timeframe === tf && (
                  <motion.span
                    layoutId="tf-indicator"
                    className="absolute inset-0 rounded-md bg-neon-green/15 border border-neon-green/25"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tf}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────── */}
      <div className="relative flex-1 min-h-[380px]">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/20 to-transparent z-10" />
        <div ref={containerRef} className="h-full w-full" style={{ minHeight: 380 }} />
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <ShimmerOverlay />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ────────────────────────── */}
      <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between">
        <p className="text-[10px] text-slate-600 font-mono">
          Candles update live · TradingView Lightweight Charts v5
        </p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[10px] text-neon-green/70 font-mono">STREAMING</span>
        </div>
      </div>
    </motion.section>
  );
}
