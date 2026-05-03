import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import { fetchPortfolio } from "../utils/api";

/* ─── Mini horizontal bar ────────────── */
function Bar({ pct, color }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

/* ─── Holding row ─────────────────────── */
function HoldingRow({ holding, total, index }) {
  const value = Number(holding.valueUsd || 0);
  const pct = total > 0 ? (value / total) * 100 : 0;
  const COLORS = ["#00e895", "#38bdf8", "#a78bfa", "#f0b429", "#ff4d6d", "#22d3ee"];
  const color = COLORS[index % COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-lg border border-white/5 bg-white/3 p-2.5 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold"
            style={{ background: `${color}18`, color }}
          >
            {(holding.symbol || "?")[0]}
          </div>
          <span className="text-xs font-medium text-slate-200">{holding.symbol}</span>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-slate-300">
            {Number(holding.quantity).toFixed(4)}
          </p>
          {value > 0 && (
            <p className="text-[10px] font-mono" style={{ color }}>
              ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      </div>
      <Bar pct={pct} color={color} />
    </motion.div>
  );
}

/* ─── Main Component ──────────────────── */
export default function PortfolioTracker() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState("");

  const onTrack = async (e) => {
    e.preventDefault();
    if (!wallet.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchPortfolio(wallet.trim());
      setPortfolio(res);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to fetch portfolio.");
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  };

  const holdings = portfolio?.holdings || [];
  const totalValue = holdings.reduce((sum, h) => sum + Number(h.valueUsd || 0), 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neon-purple/15">
          <span className="text-[10px] font-bold text-neon-purple">₿</span>
        </div>
        <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
          Portfolio Tracker
        </h3>
      </div>

      {/* Input */}
      <form onSubmit={onTrack} className="flex gap-2 border-b border-white/5 px-3 py-2.5">
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Wallet address or ENS…"
          className="flex-1 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition focus:border-neon-cyan/30 focus:bg-neon-cyan/5"
        />
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1.5 text-xs font-medium text-neon-cyan transition hover:bg-neon-cyan/20 disabled:opacity-50"
        >
          {loading ? "…" : "Track"}
        </motion.button>
      </form>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ maxHeight: 280 }}>
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-neon-red"
            >
              {error}
            </motion.p>
          )}

          {!portfolio && !error && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-2 py-8 text-center"
            >
              <span className="text-2xl opacity-20">💼</span>
              <p className="text-[11px] text-slate-600">
                Enter a wallet address to view holdings
              </p>
            </motion.div>
          )}

          {holdings.length > 0 && (
            <motion.div key="holdings" className="space-y-2">
              {/* Total */}
              {totalValue > 0 && (
                <div className="rounded-lg border border-neon-green/15 bg-neon-green/5 px-3 py-2 flex justify-between items-center mb-3">
                  <span className="text-[11px] text-slate-400">Total Value</span>
                  <span className="font-mono text-sm font-semibold text-neon-green">
                    ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {holdings.slice(0, 8).map((h, i) => (
                <HoldingRow key={`${h.symbol}-${i}`} holding={h} total={totalValue} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
