"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const PANELS = [
    {
        id: 1,
        title: "RISK-FREE TRADING",
        heading: "Virtual Trading Simulator",
        description: "Start your journey with $50,000 in virtual capital and experience real crypto market conditions.",
        features: ["Practice buying and selling crypto", "Real-time market simulation", "Track portfolio performance"],
        bgClass: "bg-gradient-to-br from-[#1a1025] to-[#0A0A0A]",
        textClass: "text-[#E9D5FF]",
        numColor: "text-white",
        circleClass: "bg-[#A855F7]/20 border-[#A855F7]/30 text-[#E9D5FF]",
        glowColor: "shadow-[0_0_30px_rgba(255,255,255,0.2)]",
    },
    {
        id: 2,
        title: "AI MARKET ANALYSIS",
        heading: "AI Chart Analysis",
        description: "Upload screenshots of crypto charts and let Solidus AI analyze them instantly. The AI highlights key patterns and trends.",
        features: ["Upload chart screenshots", "AI detects patterns and trends", "Learn technical analysis faster"],
        bgClass: "bg-gradient-to-br from-[#0c1f17] to-[#0A0A0A]",
        textClass: "text-[#A7F3D0]",
        numColor: "text-white",
        circleClass: "bg-[#10B981]/20 border-[#10B981]/30 text-[#A7F3D0]",
        glowColor: "shadow-[0_0_30px_rgba(255,255,255,0.2)]",
    },
    {
        id: 3,
        title: "CRYPTO NEWS INSIGHTS",
        heading: "Crypto Market Intelligence",
        description: "Stay informed with curated crypto market news and updates. Solidus aggregates important news from top sources.",
        features: ["Latest crypto headlines", "Market sentiment insights", "Learn how news impacts price"],
        bgClass: "bg-gradient-to-br from-[#0f172a] to-[#0A0A0A]",
        textClass: "text-[#BAE6FD]",
        numColor: "text-white",
        circleClass: "bg-[#3B82F6]/20 border-[#3B82F6]/30 text-[#BAE6FD]",
        glowColor: "shadow-[0_0_30px_rgba(255,255,255,0.2)]",
    },
    {
        id: 4,
        title: "TRADING COMPETITION",
        heading: "Weekly Leaderboard",
        description: "Compete with other traders using your virtual portfolio. The weekly leaderboard ranks users based on their performance.",
        features: ["Weekly trading rankings", "Compare strategies with others", "Track your improvement"],
        bgClass: "bg-gradient-to-br from-[#2a130f] to-[#0A0A0A]",
        bgImage: "https://images.unsplash.com/photo-1558203728-00f45181b84e?q=80&w=2670&auto=format&fit=crop",
        textClass: "text-[#FED7AA]",
        numColor: "text-white",
        circleClass: "bg-[#F97316]/30 border-[#F97316]/40 text-[#FED7AA]",
        glowColor: "shadow-[0_0_40px_rgba(255,255,255,0.25)]",
    }
];

export function ExpandingPanels() {
    const [activeId, setActiveId] = useState(1);

    // Custom, ultra-smooth spring transition setup
    const smoothTransition = {
        type: "spring",
        stiffness: 45,
        damping: 18,
        mass: 1.2
    } as const;

    return (
        <div className="flex w-full max-w-7xl mx-auto h-[600px] p-4 lg:p-10 font-sans">
            {PANELS.map((panel, index) => {
                const isActive = activeId === panel.id;

                return (
                    <motion.div
                        key={panel.id}
                        onClick={() => setActiveId(panel.id)}
                        className={`relative overflow-hidden cursor-pointer transition-all duration-500
              ${panel.bgClass} 
              ${isActive ? panel.glowColor : 'shadow-2xl'}
              ${index > 0 ? "-ml-8 md:-ml-12" : ""}
            `}
                        style={{
                            border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.05)",
                            zIndex: index,
                            borderRadius: "40px",
                            backgroundImage: panel.bgImage ? `url(${panel.bgImage})` : "none",
                            backgroundSize: "cover",
                            backgroundPosition: "center right",
                        }}
                        initial={false}
                        animate={{
                            width: isActive ? "100%" : "130px",
                            flexGrow: isActive ? 1 : 0
                        }}
                        transition={smoothTransition}
                    >
                        {/* Subtle inner glow for active panel */}
                        {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        )}

                        {/* If there's a background image, overlay so text is readable */}
                        {panel.bgImage && (
                            <div className={`absolute inset-0 transition-all duration-700 ease-in-out ${isActive ? 'bg-black/40 backdrop-blur-[2px]' : 'bg-black/70'}`} />
                        )}

                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between pointer-events-none">
                            {/* Top Content (Only visible when active) */}
                            <motion.div
                                className={`max-w-md`}
                                initial={false}
                                animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
                                transition={{ duration: 0.8, delay: isActive ? 0.3 : 0, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className={`flex items-center gap-3 mb-4 ${panel.textClass}`}>
                                    <div className={`w-2 h-2 rounded-full bg-current shadow-[0_0_12px_currentColor]`} />
                                    <span className="text-sm font-bold tracking-widest uppercase opacity-90">{panel.title}</span>
                                </div>
                                <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                                    {panel.heading}
                                </h2>
                                <p className="text-lg md:text-xl font-medium tracking-tight leading-[1.6] text-white opacity-90">
                                    {panel.description}
                                </p>
                            </motion.div>

                            {/* Bottom Left Content (Features list) */}
                            <motion.div
                                className={`flex flex-col gap-4 pb-8 md:pb-0`}
                                initial={false}
                                animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -20 }}
                                transition={{ duration: 0.8, delay: isActive ? 0.4 : 0, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {panel.features.map((feat, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full border ${panel.circleClass} text-xs font-bold leading-none backdrop-blur-md shadow-lg`}>
                                            {i + 1}
                                        </div>
                                        <span className={`text-sm font-semibold tracking-wide ${panel.textClass}`}>{feat}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>

                        {/* The HUGE Number */}
                        <motion.div
                            className={`absolute font-bold tracking-tighter ${panel.numColor} select-none`}
                            initial={false}
                            animate={{
                                fontSize: isActive ? "280px" : "140px",
                                bottom: isActive ? "-40px" : "20px",
                                right: isActive ? "8%" : "50%",
                                x: isActive ? "0%" : "50%",
                                scaleY: 1.1,
                            }}
                            style={{
                                fontFamily: "Impact, sans-serif",
                            }}
                            transition={smoothTransition}
                        >
                            {panel.id}
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
}
