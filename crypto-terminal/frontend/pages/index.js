import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen terminal-grid bg-terminal-bg px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-xl border border-terminal-border bg-terminal-panel/60 p-10 shadow-neon">
        <h1 className="text-4xl font-semibold tracking-tight text-terminal-neon">
          Crypto Terminal
        </h1>
        <p className="mt-4 text-slate-300">
          Institutional-style real-time crypto intelligence dashboard with live prices,
          AI insights, whale tracking, and portfolio monitoring.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="rounded border border-terminal-neon px-5 py-2 text-terminal-neon transition hover:bg-terminal-neon hover:text-slate-900"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
