import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

/* ─── Time formatter ─────────────────────── */
function relativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Source badge ─────────────────────── */
const SOURCE_COLORS = {
  "CoinDesk": "#f0b429",
  "CoinTelegraph": "#00e895",
  "Decrypt": "#a78bfa",
  "The Block": "#38bdf8",
  "default": "#64748b",
};

function SourceBadge({ source }) {
  const color = SOURCE_COLORS[source] || SOURCE_COLORS.default;
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[10px]" style={{ color }}>{source || "News"}</span>
    </div>
  );
}

/* ─── Single news card ─────────────────── */
function NewsCard({ item, index }) {
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ scale: 1.01, borderColor: "rgba(0,232,149,0.25)" }}
      className="block rounded-xl border border-white/7 bg-white/3 p-3 transition-colors"
    >
      <p className="text-xs font-medium leading-relaxed text-slate-200 line-clamp-2">
        {item.title}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <SourceBadge source={item.source} />
        <span className="text-[10px] text-slate-600 tabular-nums">
          {relativeTime(item.publishedAt)}
        </span>
      </div>
    </motion.a>
  );
}

/* ─── Skeleton card ──────────────────── */
function NewsSkeletonCard() {
  return (
    <div className="rounded-xl border border-white/5 p-3 space-y-2">
      <div className="h-3 w-full rounded shimmer" />
      <div className="h-3 w-4/5 rounded shimmer" />
      <div className="flex justify-between mt-1">
        <div className="h-2 w-16 rounded shimmer" />
        <div className="h-2 w-10 rounded shimmer" />
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────── */
export default function NewsPanel({ news }) {
  const listRef = useRef(null);

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card flex flex-col"
      style={{ minHeight: 260 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neon-blue/15">
            <span className="text-[10px] font-bold text-neon-blue">📰</span>
          </div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
            News Flow
          </h3>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">
          Refreshes every 60s
        </span>
      </div>

      {/* List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{ maxHeight: 280 }}
      >
        <AnimatePresence initial={false}>
          {news.length === 0 ? (
            <>
              {[...Array(3)].map((_, i) => <NewsSkeletonCard key={i} />)}
              <p className="text-center text-[11px] text-slate-600 pt-2">
                Add a CryptoPanic API key to see live news
              </p>
            </>
          ) : (
            news.map((item, i) => (
              <NewsCard key={item.id || item.url || i} item={item} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
