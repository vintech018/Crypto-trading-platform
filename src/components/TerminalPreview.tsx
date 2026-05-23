"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, LayoutDashboard, Wallet, Activity, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle2, Loader2 } from "lucide-react";

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;
type Timeframe = typeof TIMEFRAMES[number];

const MOCK_DATA: Record<Timeframe, { price: string; change: string; isPositive: boolean; path: string; candles: { height: number; type: "up" | "down"; offset: number }[] }> = {
    "1m": {
        price: "64,235.10", change: "+0.02%", isPositive: true,
        path: "M 0,250 C 100,240 200,260 300,250 C 400,230 500,250 600,230 C 700,220 800,240 900,210 L 1000,200",
        candles: [
            { height: 12, type: "up", offset: 0 },
            { height: 8, type: "down", offset: 8 },
            { height: 16, type: "up", offset: -2 },
            { height: 24, type: "up", offset: -10 },
        ]
    },
    "5m": {
        price: "64,245.20", change: "+0.12%", isPositive: true,
        path: "M 0,280 C 100,270 200,290 300,250 C 400,220 500,260 600,200 C 700,180 800,210 900,150 L 1000,140",
        candles: [
            { height: 16, type: "down", offset: 4 },
            { height: 24, type: "up", offset: -4 },
            { height: 32, type: "up", offset: -16 },
            { height: 12, type: "down", offset: -10 },
        ]
    },
    "15m": {
        price: "64,180.90", change: "-0.25%", isPositive: false,
        path: "M 0,150 C 100,160 200,140 300,180 C 400,200 500,170 600,220 C 700,250 800,230 900,280 L 1000,300",
        candles: [
            { height: 24, type: "down", offset: 8 },
            { height: 16, type: "down", offset: 16 },
            { height: 12, type: "up", offset: 12 },
            { height: 32, type: "down", offset: 24 },
        ]
    },
    "1H": {
        price: "64,230.50", change: "+2.45%", isPositive: true,
        path: "M 0,300 C 100,280 200,320 300,200 C 400,80 500,250 600,150 C 700,50 800,180 900,100 L 1000,50",
        candles: [
            { height: 16, type: "up", offset: 0 },
            { height: 24, type: "down", offset: 16 },
            { height: 32, type: "up", offset: -16 },
            { height: 20, type: "up", offset: -32 },
        ]
    },
    "4H": {
        price: "63,800.00", change: "-1.80%", isPositive: false,
        path: "M 0,80 C 100,60 200,120 300,150 C 400,120 500,200 600,230 C 700,210 800,280 900,310 L 1000,350",
        candles: [
            { height: 32, type: "down", offset: 12 },
            { height: 40, type: "down", offset: 28 },
            { height: 16, type: "up", offset: 20 },
            { height: 24, type: "down", offset: 36 },
        ]
    },
    "1D": {
        price: "61,500.00", change: "+5.20%", isPositive: true,
        path: "M 0,350 C 100,360 200,320 300,340 C 400,280 500,310 600,220 C 700,180 800,140 900,60 L 1000,20",
        candles: [
            { height: 20, type: "up", offset: 8 },
            { height: 32, type: "up", offset: -8 },
            { height: 40, type: "up", offset: -24 },
            { height: 50, type: "up", offset: -46 },
        ]
    }
};

export function TerminalPreview() {
    const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1H");
    const [orderState, setOrderState] = useState<{ type: "buy" | "sell" | null; status: "idle" | "loading" | "success" }>({ type: null, status: "idle" });
    const [chartType, setChartType] = useState<"line" | "activity" | "dashboard">("line");

    const currentData = MOCK_DATA[activeTimeframe];
    const filledPath = currentData.path + " L 1000,400 L 0,400 Z";

    const handleOrder = (type: "buy" | "sell") => {
        if (orderState.status !== "idle") return;
        setOrderState({ type, status: "loading" });
        setTimeout(() => {
            setOrderState({ type, status: "success" });
            setTimeout(() => {
                setOrderState({ type: null, status: "idle" });
            }, 2000);
        }, 800);
    };

    return (
        <section className="py-32 relative overflow-hidden bg-black" id="terminal">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        Pro-Grade Trading Terminal
                    </h2>
                    <p className="text-white/60 max-w-2xl mx-auto text-lg">
                        Experience the look and feel of a professional trading desk with our advanced virtual trading dashboard.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)] relative"
                >
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="https://assets.coingecko.com/coins/images/1/large/bitcoin.png" alt="BTC" className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        BTC/USD <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">Perp</span>
                                    </h3>
                                    <p className="text-white/50 text-xs">Bitcoin</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-white/10 hidden sm:block" />
                            <div className="hidden sm:block">
                                <motion.span
                                    key={currentData.price}
                                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                    className="text-2xl font-mono text-white tracking-tight"
                                >
                                    ${currentData.price}
                                </motion.span>
                                <motion.span
                                    key={currentData.change}
                                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                    className={`font-medium text-sm ml-2 flex items-center inline-flex ${currentData.isPositive ? "text-green-500" : "text-red-500"}`}
                                >
                                    {currentData.isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                                    {currentData.change}
                                </motion.span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-4 sm:mt-0 relative">
                            <button
                                onClick={() => handleOrder("sell")}
                                disabled={orderState.status !== "idle"}
                                className="relative overflow-hidden px-6 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 rounded font-medium transition-all text-sm border border-red-500/20 w-[120px] flex justify-center items-center h-[38px]"
                            >
                                <AnimatePresence mode="popLayout">
                                    {orderState.type === "sell" && orderState.status === "loading" ? (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 size={16} className="animate-spin" /></motion.div>
                                    ) : orderState.type === "sell" && orderState.status === "success" ? (
                                        <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><CheckCircle2 size={16} /></motion.div>
                                    ) : (
                                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sell / Short</motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                            <button
                                onClick={() => handleOrder("buy")}
                                disabled={orderState.status !== "idle"}
                                className="relative overflow-hidden px-6 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 active:scale-95 rounded font-medium transition-all text-sm border border-green-500/20 w-[120px] flex justify-center items-center h-[38px]"
                            >
                                <AnimatePresence mode="popLayout">
                                    {orderState.type === "buy" && orderState.status === "loading" ? (
                                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 size={16} className="animate-spin" /></motion.div>
                                    ) : orderState.type === "buy" && orderState.status === "success" ? (
                                        <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><CheckCircle2 size={16} /></motion.div>
                                    ) : (
                                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Buy / Long</motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[500px]">
                        {/* Sidebar Stats */}
                        <div className="border-r border-white/10 p-6 flex flex-col gap-8 bg-white/[0.01]">
                            <div>
                                <p className="text-white/50 text-sm mb-2 flex items-center gap-2">
                                    <Wallet size={16} /> Virtual Equity
                                </p>
                                <p className="text-3xl font-mono text-white">$62,450.80</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-green-500 text-sm flex items-center bg-green-500/10 px-2 py-1 rounded">
                                        <TrendingUp size={14} className="mr-1" /> +$12,450 (+24.9%)
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-white/40 text-xs uppercase font-semibold tracking-wider">Open Positions</h4>

                                <div className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white text-sm font-medium">ETH Long</span>
                                        <span className="text-green-500 text-sm font-mono">+12.4%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-white/50">
                                        <span>Size: 10 ETH</span>
                                        <span>Entry: $3,120</span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white text-sm font-medium">SOL Short</span>
                                        <span className="text-red-500 text-sm font-mono">-4.2%</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-white/50">
                                        <span>Size: 150 SOL</span>
                                        <span>Entry: $152.40</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fake Chart Area */}
                        <div className="lg:col-span-3 p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-2">
                                    {TIMEFRAMES.map((tf) => (
                                        <button
                                            key={tf}
                                            onClick={() => setActiveTimeframe(tf)}
                                            className={`text-xs px-3 py-1.5 rounded transition-colors ${activeTimeframe === tf ? "bg-white text-black font-semibold" : "text-white/60 hover:text-white hover:bg-white/10 active:scale-95"
                                                }`}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setChartType("line")} className={`p-1.5 rounded transition-colors ${chartType === "line" ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><LineChart size={18} /></button>
                                    <button onClick={() => setChartType("activity")} className={`p-1.5 rounded transition-colors ${chartType === "activity" ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><Activity size={18} /></button>
                                    <button onClick={() => setChartType("dashboard")} className={`p-1.5 rounded transition-colors ${chartType === "dashboard" ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><LayoutDashboard size={18} /></button>
                                </div>
                            </div>

                            {/* Decorative Chart SVG */}
                            <div className="flex-1 rounded-lg border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] relative overflow-hidden flex items-center justify-center min-h-[300px]">
                                <svg className="absolute inset-0 w-full h-full text-white/20" preserveAspectRatio="none" viewBox="0 0 1000 400">
                                    <motion.path
                                        animate={{ d: currentData.path }}
                                        transition={{ duration: 1, ease: "easeInOut" }}
                                        fill="none"
                                        stroke={currentData.isPositive ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                        className={currentData.isPositive ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"}
                                    />
                                    <motion.path
                                        animate={{ d: filledPath }}
                                        transition={{ duration: 1, ease: "easeInOut" }}
                                        fill="url(#chart-gradient)"
                                        opacity="0.15"
                                    />
                                    <defs>
                                        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={currentData.isPositive ? "rgba(34,197,94,1)" : "rgba(239,68,68,1)"} />
                                            <stop offset="100%" stopColor="transparent" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* Candles mock overlay */}
                                <div className="absolute inset-y-0 right-20 left-20 pointer-events-none flex items-end justify-center pb-12 gap-6 opacity-0 sm:opacity-100">
                                    <AnimatePresence>
                                        {currentData.candles.map((candle, i) => (
                                            <motion.div
                                                key={`${activeTimeframe}-${i}`}
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: candle.height * 4, opacity: 1, y: candle.offset }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                                className={`w-2.5 rounded-sm ${candle.type === "up" ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"}`}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>


                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
