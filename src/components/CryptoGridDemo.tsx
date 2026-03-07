"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock icons
const BitcoinIcon = () => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path d="M21.78 15.37c.52-3.48-2.12-5.36-5.74-6.24v-2.5h-2.17v2.58c-.57-.14-1.15-.27-1.74-.4v-2.55h-2.17v2.66c-1.83-.43-3.6-.85-4.83-1.15V9.92s1.4-.33 1.34-.3c.75.18.89.67.87 1.06v9.42c.06.03.14.07.25.13l-.25-.06v1.36c.03.42-.25.86-1.02.67.06.06-1.34-.32-1.34-.32l-.92 2.14c1.15.33 2.3.62 3.48.9v2.6h2.17v-2.58c.6.15 1.18.28 1.77.41v2.53h2.17v-2.61c4.89.92 8.56.55 9.6-3.83.84-3.5-.07-5.5-2.64-6.49 1.88-.43 3.3-1.63 3.45-3.66zm-5.33 6.94c-1.15 4.63-8.87 2.13-11.37 1.54v-3.76c2.5.6 10.22 3.12 11.37 2.22zm.45-6.6c-1.04 4.19-7.55 2.1-9.65 1.58V7.5c2.1.52 8.6 2.62 9.65 4.21z" fill="white" />
    </svg>
)

const EthereumIcon = () => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <path d="M15.82 5.06v8.43L8.5 16.74l7.32-11.68z" fill="#fff" opacity=".6" />
        <path d="M15.82 5.06L23.14 16.74l-7.32-3.25V5.06z" fill="#fff" />
        <path d="M15.82 20.89v5.98L8.5 18l7.32 2.89z" fill="#fff" opacity=".6" />
        <path d="M15.82 26.87v-5.98L23.14 18l-7.32 8.87z" fill="#fff" />
        <path d="M15.82 19.38l-7.32-4.28 7.32 3.25 7.32-3.25-7.32 4.28z" fill="#fff" opacity=".2" />
    </svg>
)

const SolanaIcon = () => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
        <circle cx="16" cy="16" r="16" fill="#000" />
        <path d="M22.9 11.9c-.2 0-.4-.1-.5-.2l-13.6-8c-.3-.2-.5 0-.5.3v2.8c0 .2.1.4.3.4l13.6 8c.3.2.5 0 .5-.3v-2.8c0-.1 0-.3-.1-.4M9.1 20.1c.2 0 .4.1.5.2l13.6 8c.3.2.5 0 .5-.3v-2.8c0-.2-.1-.4-.3-.4l-13.6-8c-.3-.2-.5 0-.5.3v2.8c0 .1.1.3.2.4M22.9 16c-.2 0-.4-.1-.5-.2l-13.6-8c-.3-.2-.5 0-.5.3v2.8c0 .2.1.4.3.4l13.6 8c.3.2.5 0 .5-.3v-2.8c0-.1-.1-.3-.2-.4" fill="#14F195" />
        <path d="M22.9 16c-.2 0-.4-.1-.5-.2l-13.6-8c-.3-.2-.5 0-.5.3v2.8c0 .2.1.4.3.4l13.6 8c.3.2.5 0 .5-.3v-2.8c0-.1-.1-.3-.2-.4" fill="#9945FF" />
    </svg>
)

const BinanceIcon = () => (
    <svg viewBox="0 0 32 32" className="w-full h-full">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
        <path d="M11.6 15.6l-3.3 3.3 3.3 3.3 3.3-3.3-3.3-3.3zM20.4 15.6l-3.3 3.3 3.3 3.3 3.3-3.3-3.3-3.3zM16 11.2l-3.3 3.3 3.3 3.3 3.3-3.3-3.3-3.3zM16 2.4L7.2 11.2 16 20l8.8-8.8L16 2.4z" fill="#fff" />
        <path d="M16 20l-4.4-4.4-1.8 1.8 6.2 6.2 6.2-6.2-1.8-1.8L16 20z" fill="#fff" />
        <path d="M16 29.6l-8.8-8.8 1.8-1.8 7 7 7-7 1.8 1.8L16 29.6z" fill="#fff" />
    </svg>
)


// Data generation
const generateData = (points: number, trend: 'up' | 'down' | 'mixed', startValue: number) => {
    let current = startValue;
    return Array.from({ length: points }, () => {
        const change = (Math.random() - (trend === 'up' ? 0.35 : trend === 'down' ? 0.65 : 0.5)) * (startValue * 0.05);
        current += change;
        return Math.max(0, current); // Prevent negative prices
    });
};

const TIMELINES = ["1M", "6M", "1Y", "3Y", "5Y", "ALL"] as const;
type Timeline = typeof TIMELINES[number];

type TokenData = {
    symbol: string;
    name: string;
    tag: string;
    color: string;
    icon: React.FC;
    annReturn: string;
    dailyReturn: string;
    isUpDay: boolean;
    timelines: Record<Timeline, number[]>;
};

const mockTokens: TokenData[] = [
    {
        symbol: 'BTC', name: 'Bitcoin', tag: 'High risk • Crypto', color: '#F7931A', icon: BitcoinIcon,
        annReturn: '+42.5%', dailyReturn: '+0.55%', isUpDay: true,
        timelines: {
            '1M': generateData(30, 'mixed', 60000), '6M': generateData(180, 'up', 40000),
            '1Y': generateData(365, 'up', 30000), '3Y': generateData(100, 'up', 20000),
            '5Y': generateData(150, 'up', 10000), 'ALL': generateData(200, 'up', 500)
        }
    },
    {
        symbol: 'ETH', name: 'Ethereum', tag: 'High risk • Crypto', color: '#627EEA', icon: EthereumIcon,
        annReturn: '+38.2%', dailyReturn: '-1.20%', isUpDay: false,
        timelines: {
            '1M': generateData(30, 'down', 3500), '6M': generateData(180, 'up', 2000),
            '1Y': generateData(365, 'up', 1500), '3Y': generateData(100, 'up', 1000),
            '5Y': generateData(150, 'up', 300), 'ALL': generateData(200, 'up', 10)
        }
    },
    {
        symbol: 'SOL', name: 'Solana', tag: 'High risk • Crypto', color: '#14F195', icon: SolanaIcon,
        annReturn: '+150.4%', dailyReturn: '+5.40%', isUpDay: true,
        timelines: {
            '1M': generateData(30, 'up', 120), '6M': generateData(180, 'up', 50),
            '1Y': generateData(365, 'up', 20), '3Y': generateData(100, 'mixed', 150),
            '5Y': generateData(150, 'up', 10), 'ALL': generateData(200, 'up', 1)
        }
    },
    {
        symbol: 'BNB', name: 'BNB', tag: 'High risk • Crypto', color: '#F3BA2F', icon: BinanceIcon,
        annReturn: '+22.1%', dailyReturn: '+0.10%', isUpDay: true,
        timelines: {
            '1M': generateData(30, 'mixed', 580), '6M': generateData(180, 'up', 300),
            '1Y': generateData(365, 'mixed', 250), '3Y': generateData(100, 'up', 50),
            '5Y': generateData(150, 'up', 20), 'ALL': generateData(200, 'up', 2)
        }
    },
];

const generatePath = (data: number[], width: number, height: number, normalizeMin = false) => {
    const max = Math.max(...data);
    const min = normalizeMin ? Math.min(...data) : 0;
    const range = max - min || 1;
    const stepX = width / Math.max(1, data.length - 1);

    return data.map((val, i) => {
        const x = i * stepX;
        const y = height - ((val - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
};

export function CryptoGridDemo() {
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [timeline, setTimeline] = useState<Timeline>('3Y');

    // Grid configuration
    const cols = 9;
    const rows = 9;
    const totalCells = cols * rows;

    const activeToken = mockTokens[activeIndex % mockTokens.length];
    const data = activeToken.timelines[timeline];

    // Compute stroke color based on token color. BTC takes orange, ETH takes blue, etc.
    const activeColor = activeToken.color;

    return (
        <section className="py-24 bg-[#050505] min-h-screen flex items-center justify-center font-sans">
            <div className="container mx-auto px-6 max-w-6xl">

                <div className="w-full flex flex-col md:flex-row items-center gap-16 md:gap-24 justify-center">

                    {/* Left Side: Subtle Grid */}
                    <div className="relative w-full max-w-[400px] aspect-square">
                        {/* Faded edges via radial mask */}
                        <div
                            className="absolute inset-0 pointer-events-none z-10"
                            style={{
                                background: 'radial-gradient(circle at center, transparent 20%, #050505 70%)'
                            }}
                        />

                        {/* The Grid */}
                        <div
                            className="absolute inset-0 grid border-t border-l border-[#333333]"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gridTemplateRows: `repeat(${rows}, 1fr)`
                            }}
                        >
                            {Array.from({ length: totalCells }).map((_, i) => {
                                const isCenterArea = i >= 20 && i <= 60; // Just to pseudo-randomize active spots
                                const mappedTokenIndex = isCenterArea ? (i % mockTokens.length) : null;

                                const isHovered = activeIndex === mappedTokenIndex;
                                const TokenIcon = mappedTokenIndex !== null ? mockTokens[mappedTokenIndex].icon : null;

                                return (
                                    <div
                                        key={i}
                                        onMouseEnter={() => {
                                            if (mappedTokenIndex !== null) setActiveIndex(mappedTokenIndex);
                                        }}
                                        className="border-r border-b border-[#333333] relative group transition-colors duration-300 hover:bg-white/[0.05]"
                                    >
                                        {TokenIcon && isHovered && (
                                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                                <div className="w-8 h-8 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                                    <TokenIcon />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side: The Detailed Card */}
                    <div className="w-[380px] shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[24px] overflow-hidden shadow-2xl relative p-6">

                        {/* Header: Icon, Title, Tag */}
                        <div className="flex items-center gap-4 mb-6">
                            <AnimatePresence mode="popLayout">
                                <motion.div
                                    key={activeToken.symbol}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-10 h-10 rounded-full"
                                >
                                    <activeToken.icon />
                                </motion.div>
                            </AnimatePresence>
                            <div>
                                <AnimatePresence mode="popLayout">
                                    <motion.h3
                                        key={activeToken.name}
                                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                        className="text-white font-semibold text-[17px] leading-tight"
                                    >
                                        {activeToken.name}
                                    </motion.h3>
                                </AnimatePresence>
                                <div className="text-neutral-500 text-[13px] font-medium mt-0.5">
                                    {activeToken.tag}
                                </div>
                            </div>
                        </div>

                        {/* Values/Returns */}
                        <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                                <AnimatePresence mode="popLayout">
                                    <motion.div
                                        key={activeToken.annReturn}
                                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                        className="text-white text-4xl font-bold tracking-tight"
                                    >
                                        {activeToken.annReturn}
                                    </motion.div>
                                </AnimatePresence>
                                <div className="text-neutral-500 text-[13px] font-medium">
                                    {timeline} annualized
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={activeToken.isUpDay ? "text-green-500" : "text-red-500"}>
                                    {activeToken.isUpDay ? (
                                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                                    ) : (
                                        <path d="M7 7L17 17M17 17H7M17 17V7" />
                                    )}
                                </svg>
                                <AnimatePresence mode="popLayout">
                                    <motion.span
                                        key={activeToken.dailyReturn}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className={`text-[13px] font-semibold tracking-wide ${activeToken.isUpDay ? "text-green-500" : "text-red-500"}`}
                                    >
                                        {activeToken.dailyReturn} 1D
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Animated Chart SVG */}
                        <div className="h-[120px] w-full relative mb-6">
                            <AnimatePresence mode="wait">
                                <motion.svg
                                    key={activeToken.symbol + timeline}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full h-full overflow-visible"
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        <linearGradient id={`fill-${activeToken.symbol}`} x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor={activeColor} stopOpacity="0.15" />
                                            <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
                                        </linearGradient>
                                    </defs>

                                    {/* Line */}
                                    <motion.path
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.7, ease: "easeOut" }}
                                        d={generatePath(data, 332, 120, true)} // 380 - 48 padding = 332 width
                                        fill="none"
                                        stroke={activeColor}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform-gpu"
                                        vectorEffect="non-scaling-stroke"
                                    />

                                    {/* Fill */}
                                    <motion.path
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        d={`${generatePath(data, 332, 120, true)} L 332 120 L 0 120 Z`}
                                        fill={`url(#fill-${activeToken.symbol})`}
                                    />
                                </motion.svg>
                            </AnimatePresence>
                        </div>

                        {/* Timeline Selector */}
                        <div className="flex items-center justify-between w-full mb-8 px-1">
                            {TIMELINES.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTimeline(t)}
                                    className={`text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors ${timeline === t
                                        ? 'bg-[#222] text-white'
                                        : 'text-[#666] hover:text-[#ccc]'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Buy/Sell Buttons */}
                        <div className="flex items-center gap-3">
                            <button className="flex-1 bg-transparent border border-white/10 hover:border-white/20 text-white font-semibold py-3.5 rounded-[12px] text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20">
                                Sell
                            </button>
                            <button className="flex-1 bg-white hover:bg-white/90 text-black font-bold py-3.5 rounded-[12px] text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                Buy
                            </button>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}
