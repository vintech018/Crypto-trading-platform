import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { askResearch } from "../utils/api";

/* ─── Typewriter hook ────────────────────────── */
function useTypewriter(text, speed = 12) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    if (!text) { setVisible(""); return; }
    let i = 0;
    setVisible("");
    const timer = setInterval(() => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return visible;
}

/* ─── Thinking dots ──────────────────────────── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

/* ─── Message bubble ─────────────────────────── */
function MessageBubble({ role, content, isLatest }) {
  const typed = useTypewriter(role === "ai" && isLatest ? content : null, 10);
  const displayed = role === "ai" && isLatest ? typed : content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      {role === "ai" && (
        <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neon-green/15 text-[10px] text-neon-green font-bold">
          AI
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${role === "user"
            ? "rounded-tr-sm bg-white/8 text-slate-200"
            : "rounded-tl-sm border border-neon-green/15 bg-neon-green/5 text-slate-200"
          }`}
      >
        {displayed}
        {role === "ai" && isLatest && displayed.length < (content?.length || 0) && (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-neon-green align-middle" />
        )}
      </div>
      {role === "user" && (
        <div className="ml-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] text-slate-400 font-bold">
          U
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────── */
export default function AIResearchPanel() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hello! I can analyze crypto markets in real time. Ask me anything — price movements, whale activity, sentiment, or on-chain data." },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuery("");
    setLoading(true);
    setError("");

    try {
      const response = await askResearch(q);
      const answer = response?.analysis?.summary || "No analysis available.";
      setMessages((prev) => [...prev, { role: "ai", content: answer }]);
    } catch (err) {
      const msg = err?.response?.data?.error || "Analysis failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const SUGGESTIONS = ["Why is BTC pumping?", "Best altcoin plays now?", "Is ETH bullish?"];

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card flex flex-col"
      style={{ height: "calc(50% - 8px)", minHeight: 320 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neon-green/15">
            <span className="text-[10px] font-bold text-neon-green">AI</span>
          </div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
            Market Insights
          </h3>
        </div>
        <span className="rounded-full bg-neon-green/10 px-2 py-0.5 text-[10px] text-neon-green font-mono">
          GPT-4o
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 min-h-0">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            isLatest={i === messages.length - 1}
          />
        ))}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neon-green/15 text-[10px] text-neon-green font-bold">
                AI
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-neon-green/15 bg-neon-green/5">
                <ThinkingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <p className="text-[11px] text-neon-red px-2">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-slate-400 transition hover:border-neon-green/30 hover:text-neon-green"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="border-t border-white/5 px-3 py-2 flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask a market question… (Enter to send)"
          className="flex-1 resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition focus:border-neon-green/30 focus:bg-neon-green/5"
          style={{ maxHeight: 80 }}
        />
        <motion.button
          type="submit"
          disabled={loading || !query.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-neon-green/90 text-black disabled:opacity-40 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
          </svg>
        </motion.button>
      </form>
    </motion.section>
  );
}
