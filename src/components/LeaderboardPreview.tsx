"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, ArrowUpRight } from "lucide-react";
import { InteractiveGridPattern } from "./ui/interactive-grid-pattern";

import Link from "next/link";
import Image from "next/image";

export function LeaderboardPreview() {
    const leaderboardData = [
        { rank: 1, trader: "GhostTrader", tags: "#CRYPTO · 142 TRADES", profit: "+24.5%", sparkfill: "100%", value: "$62,000", badge: "text-amber-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" },
        { rank: 2, trader: "CryptoNinja", tags: "#DEFI · 98 TRADES", profit: "+19.2%", sparkfill: "78%", value: "$59,500", badge: "text-gray-300 drop-shadow-[0_0_8px_rgba(200,200,200,0.5)]" },
        { rank: 3, trader: "AlphaBTC", tags: "#BTC · 77 TRADES", profit: "+15.8%", sparkfill: "64%", value: "$57,300", badge: "text-amber-700 drop-shadow-[0_0_8px_rgba(150,150,150,0.5)]" },
        { rank: 4, trader: "Satoshi_Fan", tags: "#HODL · 53 TRADES", profit: "+12.1%", sparkfill: "49%", value: "$56,050", badge: "text-white/40" },
        { rank: 5, trader: "MoonWalker", tags: "#ALT · 61 TRADES", profit: "+9.4%", sparkfill: "38%", value: "$54,700", badge: "text-white/40" },
        { rank: 6, trader: "EagleEye", tags: "#FOREX · 44 TRADES", profit: "+7.1%", sparkfill: "29%", value: "$53,550", badge: "text-white/40" },
        { rank: 7, trader: "DragonDAO", tags: "#NFT · 39 TRADES", profit: "+5.3%", sparkfill: "21%", value: "$52,650", badge: "text-white/40" },
        { rank: 8, trader: "RoboQuant", tags: "#ALGO · 112 TRADES", profit: "+3.8%", sparkfill: "15%", value: "$51,900", badge: "text-white/40" },
    ];

    return (
        <section className="py-24 relative bg-black overflow-hidden" id="leaderboard">
            {/* Interactive Grid with Top Fade Mask */}
            <div className="absolute inset-0" style={{ maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)" }}>
                <InteractiveGridPattern
                    className="opacity-70"
                    glowColor="rgba(255, 255, 255, 0.2)"
                    borderColor="rgba(255, 255, 255, 0.05)"
                />
            </div>
            {/* Scanline Overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)'
                }}
            />

            <div className="container mx-auto px-6 max-w-5xl relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col md:flex-row items-start justify-between mb-12 gap-6"
                >
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            <motion.div
                                animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Trophy className="text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.6)]" size={36} />
                            </motion.div>
                            <h2 className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-400 tracking-tight">
                                Global Leaderboard
                            </h2>
                        </div>
                        <p className="text-neutral-500 font-mono text-sm tracking-wide pl-1">
                            Compete weekly for the top spot. Prove your strategies.
                        </p>
                    </div>
                    <Link href="/login" className="group relative overflow-hidden px-6 py-3 border border-white/15 text-white font-display font-semibold rounded-lg text-sm tracking-wide transition-all hover:border-white hover:text-white mt-2">
                        <span className="relative z-10 flex items-center gap-2">
                            View Full Rankings <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden relative shadow-2xl"
                >
                    {/* Top gradient highlight border */}
                    <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                            {/* Headers */}
                            <div className="grid grid-cols-[100px_1fr_200px_200px] px-8 py-5 border-b border-white/[0.06] bg-black/40">
                                <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase">Rank</span>
                                <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase">Trader</span>
                                <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase text-right">Weekly Profit</span>
                                <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase text-right">Portfolio Value</span>
                            </div>

                            {/* Rows Container */}
                            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                                {leaderboardData.map((row, index) => (
                                    <motion.div
                                        key={row.trader}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true }}
                                        variants={{
                                            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 + (index * 0.1) } }
                                        }}
                                        className="group grid grid-cols-[100px_1fr_200px_200px] items-center px-8 py-6 border-b border-white/[0.06] last:border-0 relative cursor-pointer"
                                    >
                                        {/* Row Hover Backgrounds */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        {row.rank === 1 && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] via-white/[0.01] to-transparent pointer-events-none" />
                                        )}

                                        {/* Accent Bar */}
                                        <div className={`absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r opacity-0 scale-y-0 group-hover:opacity-100 group-hover:scale-y-100 transition-all duration-300 ${row.rank === 1 ? 'bg-gradient-to-b from-white to-white/30 opacity-100 scale-y-100' : 'bg-white'}`} />

                                        {/* Rank */}
                                        <motion.div variants={{ hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0 } }} className="relative z-10 flex items-center">
                                            {row.rank <= 3 ? (
                                                <span className={`text-2xl group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-300 ${row.rank === 1 ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : row.rank === 2 ? 'drop-shadow-[0_0_8px_rgba(200,200,200,0.5)]' : 'drop-shadow-[0_0_8px_rgba(150,150,150,0.5)]'}`}>
                                                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}
                                                </span>
                                            ) : (
                                                <span className="font-mono text-neutral-500 font-bold text-lg w-8 text-center">{row.rank}</span>
                                            )}
                                        </motion.div>

                                        {/* Trader */}
                                        <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }} className="relative z-10 flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-full bg-[#161616] border-2 border-white/[0.06] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-white/40 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 overflow-hidden">
                                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.trader}`} alt="avatar" width={44} height={44} unoptimized className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white group-hover:text-neutral-200 transition-colors">{row.trader}</span>
                                                <span className="font-mono text-[0.65rem] text-neutral-500 tracking-wider mt-0.5">{row.tags}</span>
                                            </div>
                                        </motion.div>

                                        {/* Profit */}
                                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="relative z-10 flex flex-col items-end gap-1.5 pr-4">
                                            <span className="font-mono font-bold text-white flex items-center gap-1 group-hover:scale-105 transition-transform duration-300">
                                                <TrendingUp size={14} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] mr-1" /> {row.profit}
                                            </span>
                                            <div className="h-[3px] w-20 bg-white/10 rounded-sm overflow-hidden relative">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: row.sparkfill }}
                                                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.5 + (index * 0.1) }}
                                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-white/40 to-white rounded-sm"
                                                >
                                                    <div className="absolute right-0 top-0 bottom-0 w-[6px] bg-white blur-[2px]" />
                                                </motion.div>
                                            </div>
                                        </motion.div>

                                        {/* Portfolio Value */}
                                        <motion.div variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }} className="relative z-10 text-right">
                                            <span className="font-mono font-bold text-white group-hover:text-neutral-200 transition-colors block">
                                                {row.value}
                                            </span>
                                            <span className="font-mono text-[0.6rem] text-neutral-500 tracking-wider mt-1 block">
                                                ↑ FROM ${(parseInt(row.value.replace(/[$,]/g, '')) * 0.8).toLocaleString()}
                                            </span>
                                        </motion.div>

                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1 }}
                    className="flex justify-between items-center mt-6 px-2"
                >
                    <span className="font-mono text-[0.65rem] text-neutral-500 tracking-wider">LAST UPDATED · 2 MIN AGO</span>
                </motion.div>
            </div>
        </section>
    );
}
