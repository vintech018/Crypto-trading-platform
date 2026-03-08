"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

// Premium crisp crypto icons - vibrant brand colors restored for the chart graph
const BASE_CRYPTO_DATA = [
    { id: "btc", name: "Bitcoin", symbol: "BTC", type: "High risk • Crypto", growth: "+42.5%", isPositive: true, color: "#F7931A", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png", historicalData: [10, 15, 12, 20, 18, 25, 30] },
    { id: "eth", name: "Ethereum", symbol: "ETH", type: "High risk • Crypto", growth: "+38.2%", isPositive: true, color: "#627EEA", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png", historicalData: [15, 10, 20, 18, 25, 22, 35] },
    { id: "sol", name: "Solana", symbol: "SOL", type: "High risk • Crypto", growth: "+85.4%", isPositive: true, color: "#14F195", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/sol.png", historicalData: [5, 12, 10, 22, 20, 35, 45] },
    { id: "bnb", name: "BNB", symbol: "BNB", type: "High risk • Crypto", growth: "+12.1%", isPositive: true, color: "#F3BA2F", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png", historicalData: [20, 22, 21, 25, 24, 28, 30] },
    { id: "ada", name: "Cardano", symbol: "ADA", type: "High risk • Crypto", growth: "-18.9%", isPositive: false, color: "#0033AD", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/ada.png", historicalData: [30, 25, 28, 20, 22, 25, 15] },
    { id: "matic", name: "Polygon", symbol: "MATIC", type: "Medium risk • Layer 2", growth: "+24.5%", isPositive: true, color: "#8247E5", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png", historicalData: [12, 18, 15, 25, 30, 28, 35] },
    { id: "dot", name: "Polkadot", symbol: "DOT", type: "High risk • Crypto", growth: "-5.3%", isPositive: false, color: "#E6007A", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/dot.png", historicalData: [25, 20, 22, 18, 25, 30, 22] },
    { id: "link", name: "Chainlink", symbol: "LINK", type: "Medium risk • Oracle", growth: "+32.1%", isPositive: true, color: "#2A5ADA", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/link.png", historicalData: [10, 15, 20, 25, 22, 30, 40] },
    { id: "uni", name: "Uniswap", symbol: "UNI", type: "Medium risk • DeFi", growth: "+21.4%", isPositive: true, color: "#FF007A", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/uni.png", historicalData: [15, 20, 18, 25, 30, 25, 35] },
    { id: "avax", name: "Avalanche", symbol: "AVAX", type: "High risk • Layer 1", growth: "+45.2%", isPositive: true, color: "#E84142", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/avax.png", historicalData: [8, 15, 20, 25, 35, 40, 50] },
    { id: "ltc", name: "Litecoin", symbol: "LTC", type: "Medium risk • Crypto", growth: "+14.7%", isPositive: true, color: "#345D9D", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/ltc.png", historicalData: [20, 18, 25, 30, 28, 35, 45] },
    { id: "atom", name: "Cosmos", symbol: "ATOM", type: "High risk • Crypto", growth: "-6.5%", isPositive: false, color: "#2E3148", icon: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/atom.png", historicalData: [22, 25, 20, 28, 30, 25, 18] },
];

const TOTAL_ROWS = 10;
const TOTAL_COLS = 8;
const TOTAL_CELLS = TOTAL_ROWS * TOTAL_COLS;

const ALL_CELLS = Array.from({ length: TOTAL_CELLS }, (_, i) => {
    const row = Math.floor(i / TOTAL_COLS) + 1;
    const col = (i % TOTAL_COLS) + 1;
    const coin = {
        ...BASE_CRYPTO_DATA[i % BASE_CRYPTO_DATA.length],
        uniqueId: `cell-${i}`
    };
    return { id: i, row, col, coin };
});

const SparklineSVG = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((val, index) => {
        const x = (index / (data.length - 1)) * 200;
        const y = 80 - ((val - min) / range) * 60;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="6"
                className="opacity-20 blur-sm translate-y-1"
            />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default function CryptoGrid() {
    const [hoveredCoin, setHoveredCoin] = useState<typeof ALL_CELLS[0]["coin"] | null>(null);
    const [timeline, setTimeline] = useState("3Y");

    // When hovering off the grid entirely, we can optionally clear the card. 
    // Let's keep the last hovered card visible so it doesn't flicker away instantly.
    const handleMouseLeaveGrid = () => {
        // Intentionally empty: keeping the last chart visible looks better than it disappearing
    };

    const chartData = hoveredCoin ? hoveredCoin.historicalData.map((val, i) => {
        if (timeline === "3Y") return val;
        if (timeline === "1M") return val + Math.sin(i * 1.5) * 8;
        if (timeline === "6M") return val + Math.cos(i * 2.2) * 12;
        if (timeline === "1Y") return val + Math.sin(i * 0.5) * 5;
        if (timeline === "5Y") return val + Math.cos(i * 0.8) * 18 + i * 2;
        if (timeline === "All") return val + Math.sin(i * 0.3) * 25 + i * 6;
        return val;
    }) : [];

    // Generate dynamic metric numbers based on timeline selection so it looks real
    const getDynamicGrowth = () => {
        if (!hoveredCoin) return "+0.0%";
        const base = parseFloat(hoveredCoin.growth);
        const multiplier = {
            "1M": 0.1, "6M": 0.4, "1Y": 0.7, "3Y": 1.0, "5Y": 1.6, "All": 2.5
        }[timeline] || 1;
        const value = base * multiplier;
        return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
    };

    const getDynamicDaily = () => {
        if (!hoveredCoin) return "+0.00%";
        const base = hoveredCoin.isPositive ? 0.55 : -0.21;
        const variation = {
            "1M": 0.8, "6M": 1.2, "1Y": 0.5, "3Y": 1.0, "5Y": 1.8, "All": 2.2
        }[timeline] || 1;
        const value = base * variation;
        return value > 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`;
    };

    const dynamicGrowth = getDynamicGrowth();
    const dynamicDaily = getDynamicDaily();
    const isDynamicPositive = dynamicGrowth.startsWith("+");

    return (
        <section className="w-full min-h-screen bg-black py-32 relative overflow-hidden flex flex-col items-center">

            {/* Header section - updated for Instant Execution text */}
            <div className="max-w-[1200px] w-full px-6 mb-16 flex flex-col items-center justify-center z-20 relative text-center">
                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Instant Execution. Total Control.</h2>
                <p className="text-white/50 text-base font-medium">Buy and sell with one click.</p>
            </div>

            <div className="max-w-[1200px] w-full px-6 flex relative z-10 transition-all duration-500 ease-in-out mt-8">

                {/* Left Side: The Interactive Grid */}
                <div className="flex-1 max-w-[60%]">
                    {/* Apply mask-image so the grid seamlessly fades out at the edges */}
                    <div
                        className="w-full aspect-[4/5] grid border-t border-l border-white/20 rounded-sm relative"
                        style={{
                            gridTemplateColumns: `repeat(${TOTAL_COLS}, 1fr)`,
                            gridTemplateRows: `repeat(${TOTAL_ROWS}, 1fr)`,
                            maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                            WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)"
                        }}
                        onMouseLeave={handleMouseLeaveGrid}
                    >
                        {ALL_CELLS.map((cell) => {
                            const isHovered = hoveredCoin?.uniqueId === cell.coin.uniqueId;

                            return (
                                <div
                                    key={cell.id}
                                    className="border-r border-b border-white/20 relative flex items-center justify-center group"
                                    onMouseEnter={() => setHoveredCoin(cell.coin)}
                                >
                                    {/* Token image hidden by default, visible on hover */}
                                    <motion.div
                                        className="w-[45%] h-[45%] transition-all duration-300 ease-out z-10 relative cursor-pointer"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{
                                            opacity: isHovered ? 1 : 0,
                                            scale: isHovered ? 1 : 0.8
                                        }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <img
                                            src={cell.coin.icon}
                                            alt={cell.coin.name}
                                            className="w-full h-full object-contain select-none drop-shadow-lg"
                                            draggable="false"
                                        />
                                    </motion.div>

                                    {/* Subtle cell highlight when hovered */}
                                    {isHovered && (
                                        <motion.div
                                            layoutId="cell-highlight"
                                            className="absolute inset-0 bg-white/[0.04] -z-10"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: The Dynamic Floating Info Card */}
                <div className="flex-1 relative ml-12 lg:ml-24">
                    <AnimatePresence mode="wait">
                        {hoveredCoin ? (
                            <motion.div
                                key={hoveredCoin.uniqueId}
                                initial={{ opacity: 0, y: 15, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -15, scale: 0.97 }}
                                transition={{ duration: 0.3, type: "spring", stiffness: 250, damping: 25 }}
                                className="sticky top-32 w-full max-w-[420px] bg-[#0A0A0A] rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/[0.08]"
                            >
                                {/* Card Header */}
                                <div className="flex items-start gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10 p-2.5 bg-black/40 shadow-inner">
                                        <img src={hoveredCoin.icon} alt={hoveredCoin.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h2 className="text-[22px] font-bold text-white tracking-tight leading-none">{hoveredCoin.name}</h2>
                                        <p className="text-[13px] font-medium text-white/40 mt-1.5">{hoveredCoin.type}</p>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="mt-8 flex items-baseline gap-3">
                                    <span className="text-[36px] font-bold tracking-tight text-white">{dynamicGrowth}</span>
                                    <span className="text-[13px] font-semibold text-white/40">{timeline} annualized</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold mt-1" style={{ color: isDynamicPositive ? '#00E699' : '#FF4D4D' }}>
                                    {isDynamicPositive ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
                                    <span>{dynamicDaily} 1D</span>
                                </div>

                                {/* Animated Chart Area */}
                                <div className="w-full h-[180px] mt-8 mb-6 relative">
                                    <SparklineSVG data={chartData} color={hoveredCoin.color} />
                                </div>

                                {/* Chart Timelines */}
                                <div className="flex justify-between items-center text-[11px] font-bold tracking-wide text-white/40 px-2 mb-8">
                                    {["1M", "6M", "1Y", "3Y", "5Y", "All"].map((t) => (
                                        <span
                                            key={t}
                                            onClick={() => setTimeline(t)}
                                            className={`cursor-pointer transition-colors ${timeline === t
                                                ? "bg-white/10 text-white px-3.5 py-1.5 rounded-full shadow-sm border border-white/5"
                                                : "hover:text-white"
                                                }`}
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 w-full">
                                    <Link href="/signup" className="flex-1">
                                        <button className="w-full py-3.5 rounded-xl border border-white/10 text-white font-bold text-sm tracking-wide hover:bg-white/5 transition-colors active:scale-[0.98]">
                                            Sell
                                        </button>
                                    </Link>
                                    <Link href="/signup" className="flex-1">
                                        <button
                                            className="w-full py-3.5 rounded-xl text-black font-bold text-sm tracking-wide bg-white hover:bg-white/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                        >
                                            Buy
                                        </button>
                                    </Link>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full h-full flex flex-col items-center justify-center text-center opacity-40 pt-32"
                            >
                                <div className="w-16 h-16 border-2 border-dashed border-white/20 rounded-full mb-4 opacity-30"></div>
                                <p className="text-lg font-medium text-white/40 tracking-tight">Hover over the grid to explore tokens</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
