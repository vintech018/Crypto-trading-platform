import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";

/* ─── Coin meta ─────────────────────────────────── */
const COIN_META = {
  BTCUSDT: { label: "BTC", name: "Bitcoin", icon: "₿", accent: "#f0b429" },
  ETHUSDT: { label: "ETH", name: "Ethereum", icon: "Ξ", accent: "#a78bfa" },
  SOLUSDT: { label: "SOL", name: "Solana", icon: "◎", accent: "#38bdf8" },
};

/* ─── Animated sparkline with gradient fill ─────── */
function Sparkline({ values = [], direction }) {
  if (values.length < 2) {
    return <div className="h-12 w-full rounded-lg shimmer" />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 100;
  const H = 40;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return [x, y];
  });

  const polyPts = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPath = [
    `M ${pts[0][0]},${pts[0][1]}`,
    ...pts.slice(1).map(([x, y]) => `L ${x},${y}`),
    `L ${pts[pts.length - 1][0]},${H}`,
    `L ${pts[0][0]},${H}`,
    "Z",
  ].join(" ");

  const upColor = "#00e895";
  const downColor = "#ff4d6d";
  const color = direction === "down" ? downColor : upColor;
  const id = `grad-${direction}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Animated number ───────────────────────────── */
function AnimatedPrice({ price, direction }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={price}
        initial={{ opacity: 0, y: direction === "down" ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: direction === "down" ? 10 : -10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={`font-mono text-2xl font-semibold tabular-nums ${direction === "down" ? "glow-red" : "glow-green"
          }`}
      >
        ${Number(price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </motion.span>
    </AnimatePresence>
  );
}

/* ─── Single Ticker Card ─────────────────────────── */
const TickerCard = memo(function TickerCard({ symbol, item, stat }) {
  const meta = COIN_META[symbol] || { label: symbol, icon: "●", accent: "#00e895" };
  const change = stat?.priceChangePercent ?? 0;
  const isUp = change >= 0;
  const direction = item?.direction || "flat";
  const flashRef = useRef(null);

  // Flash background on price change
  useEffect(() => {
    if (!flashRef.current || direction === "flat") return;
    const el = flashRef.current;
    el.classList.remove("price-flash-up", "price-flash-down");
    void el.offsetWidth; // reflow to restart animation
    el.classList.add(direction === "up" ? "price-flash-up" : "price-flash-down");
  }, [item?.price, direction]);

  const volume = stat?.quoteVolume
    ? `$${(Number(stat.quoteVolume) / 1e6).toFixed(1)}M`
    : "—";
  const high = stat?.highPrice ? `$${Number(stat.highPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";
  const low = stat?.lowPrice ? `$${Number(stat.lowPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ duration: 0.25 }}
      className="glass-card glass-card-hover relative overflow-hidden p-4"
      style={{
        borderColor: direction === "up"
          ? "rgba(0,232,149,0.20)"
          : direction === "down"
            ? "rgba(255,77,109,0.20)"
            : "rgba(255,255,255,0.07)",
      }}
    >
      {/* Flash overlay */}
      <div ref={flashRef} className="pointer-events-none absolute inset-0 rounded-[inherit]" />

      {/* Accent strip */}
      <div
        className="absolute right-0 top-0 h-full w-[3px] rounded-r-[inherit]"
        style={{ background: meta.accent, opacity: 0.6 }}
      />

      {/* Header row */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            style={{ background: `${meta.accent}18`, color: meta.accent }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{meta.label}</p>
            <p className="text-[10px] text-slate-500">{meta.name}</p>
          </div>
        </div>

        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${isUp ? "bg-neon-green/15 text-neon-green" : "bg-neon-red/15 text-neon-red"
            }`}
        >
          {isUp ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>

      {/* Price */}
      <div className="mb-3 min-h-[32px]">
        <AnimatedPrice price={item?.price} direction={direction} />
      </div>

      {/* Sparkline */}
      <div className="mb-3">
        <Sparkline values={item?.sparkline || []} direction={direction} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 border-t border-white/5 pt-2">
        {[["H", high], ["L", low], ["Vol", volume]].map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider">{label}</p>
            <p className="text-[11px] font-medium text-slate-300 tabular-nums">{val}</p>
          </div>
        ))}
      </div>
    </motion.article>
  );
});

/* ─── Main Ticker ─────────────────────────────────── */
export default function MarketTicker({ prices, tickerStats, connectionState }) {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-4"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-medium tracking-[0.25em] text-slate-400 uppercase">
            Live Markets
          </span>
          <div className="h-px w-12 bg-gradient-to-r from-neon-green/30 to-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${connectionState}`} />
          <span
            className={`text-xs font-mono capitalize ${connectionState === "connected" ? "text-neon-green" : "text-neon-gold"
              }`}
          >
            {connectionState}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {symbols.map((symbol, i) => (
          <motion.div
            key={symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <TickerCard
              symbol={symbol}
              item={prices[symbol]}
              stat={tickerStats[symbol]}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
