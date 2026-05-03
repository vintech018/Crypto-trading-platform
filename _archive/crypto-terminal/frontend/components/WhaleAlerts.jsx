import { AnimatePresence, motion } from "framer-motion";

/* ─── Tier classification ─────────────── */
function getTier(valueUsd) {
  const v = Number(valueUsd || 0);
  if (v >= 10_000_000) return { label: "MEGA", color: "#f0b429", glow: "rgba(240,180,41,0.3)" };
  if (v >= 1_000_000) return { label: "LARGE", color: "#00e895", glow: "rgba(0,232,149,0.3)" };
  return { label: "MED", color: "#38bdf8", glow: "rgba(56,189,248,0.3)" };
}

function formatUsd(value) {
  const v = Number(value || 0);
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function relTime(ts) {
  const diff = Date.now() - new Date(ts || Date.now()).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/* ─── Single Alert Card ─────────────── */
function AlertCard({ alert }) {
  const tier = getTier(alert.valueUsd);
  const symbol = (alert.symbol || "BTC").replace("USDT", "");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border p-3"
      style={{
        borderColor: `${tier.color}25`,
        background: `linear-gradient(135deg, ${tier.color}08, transparent)`,
        boxShadow: `0 0 20px ${tier.glow}`,
      }}
    >
      {/* Tier badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Animated whale pulse */}
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-base"
          >
            🐋
          </motion.span>
          <div>
            <p className="text-xs font-semibold text-white leading-none">
              {alert.message || `Large ${symbol} trade detected`}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{symbol} · {relTime(alert.tradeTime)}</p>
          </div>
        </div>
        <span
          className="flex-shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-widest"
          style={{ background: `${tier.color}18`, color: tier.color }}
        >
          {tier.label}
        </span>
      </div>

      {/* Value */}
      {alert.valueUsd > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
          style={{ background: `${tier.color}0d` }}
        >
          <span className="text-[10px] text-slate-500">Trade Value</span>
          <span
            className="font-mono text-sm font-bold"
            style={{ color: tier.color, textShadow: `0 0 10px ${tier.glow}` }}
          >
            {formatUsd(alert.valueUsd)}
          </span>
        </div>
      )}

      {/* Glow stripe */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-0.5 rounded-l"
        style={{ background: tier.color }}
      />
    </motion.div>
  );
}

/* ─── Empty state ────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <motion.span
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="text-3xl opacity-30"
      >
        🐋
      </motion.span>
      <p className="text-[11px] text-slate-600">Monitoring for whale trades…</p>
    </div>
  );
}

/* ─── Main component ─────────────────── */
export default function WhaleAlerts({ alerts }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass-card flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neon-gold/15 text-base">
            🐋
          </div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
            Whale Alerts
          </h3>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-neon-gold/15 px-2 py-0.5 text-[10px] text-neon-gold font-mono">
            {alerts.length} detected
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ maxHeight: 300 }}>
        <AnimatePresence initial={false}>
          {alerts.length > 0
            ? alerts.slice(0, 20).map((alert) => (
              <AlertCard key={alert.id || `${alert.symbol}-${alert.tradeTime}`} alert={alert} />
            ))
            : <EmptyState />}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
