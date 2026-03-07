"use client";

import { motion } from "framer-motion";
import { Upload, ScanLine, TrendingUp, Activity, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function AIShowcase() {
    const [analyzing, setAnalyzing] = useState(false);
    const [complete, setComplete] = useState(false);

    const triggerAnalysis = () => {
        setAnalyzing(true);
        setTimeout(() => {
            setAnalyzing(false);
            setComplete(true);
        }, 2500);
    };

    const reset = () => {
        setComplete(false);
    };

    return (
        <section className="py-24 bg-black border-t border-white/10" id="ai-analysis">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="flex flex-col lg:flex-row items-center gap-16">

                    {/* Left Text */}
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 flex flex-wrap overflow-hidden pb-2">
                            {"AI Chart Analysis".split("").map((char, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ y: "100%" }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.03, ease: [0.33, 1, 0.68, 1] }}
                                    className={char === " " ? "w-3 md:w-4" : "inline-block"}
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="text-white/60 text-lg leading-relaxed mb-8"
                        >
                            Don't trade blindly. Upload your technical charts and let our specialized AI engine identify emerging trends, precise support/resistance zones, and historical patterns instantly.
                        </motion.p>

                        <motion.ul
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={{
                                visible: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } }
                            }}
                            className="space-y-4 mb-8"
                        >
                            {['Trend Direction Analysis', 'Support & Resistance Mapping', 'Pattern Recognition (Head & Shoulders, Flags, etc)'].map((item) => (
                                <motion.li
                                    key={item}
                                    variants={{
                                        hidden: { opacity: 0, x: -20 },
                                        visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 12 } }
                                    }}
                                    className="flex items-center gap-3 text-white/80"
                                >
                                    <CheckCircle2 size={18} className="text-white" />
                                    {item}
                                </motion.li>
                            ))}
                        </motion.ul>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 1.0 }}
                        >
                            <button
                                onClick={complete ? reset : triggerAnalysis}
                                className="px-6 py-3 bg-white text-black font-semibold rounded hover:bg-white/90 transition-colors"
                            >
                                {complete ? "Reset Demo" : analyzing ? "Processing..." : "Try Demo Analysis"}
                            </button>
                        </motion.div>
                    </div>

                    {/* Right Interface Demo */}
                    <div className="w-full lg:w-1/2">
                        <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.05)] h-[400px]">

                            {!analyzing && !complete && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/[0.02]">
                                    <Upload className="w-12 h-12 text-white/40 mb-4" />
                                    <p className="text-white font-medium mb-1">Upload Crypto Chart</p>
                                    <p className="text-white/40 text-sm">PNG, JPG up to 10MB</p>
                                </div>
                            )}

                            {analyzing && (
                                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                                    <div className="relative w-64 h-48 mb-6 border border-white/20 rounded overflow-hidden">
                                        <div className="absolute inset-0 flex items-center justify-center text-white/20 font-mono text-xs">
                                            [IMG_DATA_STREAM]
                                        </div>
                                        {/* Scanning animation */}
                                        <motion.div
                                            animate={{ top: ["0%", "100%", "0%"] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 right-0 h-1 bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10"
                                        />
                                        <ScanLine className="absolute inset-0 w-full h-full text-white/20 p-8" />
                                    </div>
                                    <p className="text-white font-mono text-sm animate-pulse">Running neural network inference...</p>
                                </div>
                            )}

                            {complete && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 p-6 bg-black flex flex-col pt-8"
                                >
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <Activity size={18} /> Analysis Complete
                                        </h3>
                                        <span className="text-xs font-mono bg-white/10 text-white px-2 py-1 rounded">V2.4.1</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-3 bg-white/5 rounded border border-white/10">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-white/60 text-sm">Trend Direction</span>
                                                <span className="text-green-500 font-medium text-sm flex items-center gap-1">
                                                    <TrendingUp size={14} /> Bullish Continuation
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                                <div className="bg-green-500 h-full w-[85%]" />
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white/5 rounded border border-white/10">
                                            <span className="text-white/60 text-sm block mb-2">Key Levels</span>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-white">Resistance</span>
                                                <span className="font-mono text-white/80">$65,200</span>
                                            </div>
                                            <div className="flex justify-between text-sm mt-1">
                                                <span className="text-white">Support</span>
                                                <span className="font-mono text-white/80">$62,800</span>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-white/5 rounded border border-white/10">
                                            <span className="text-white/60 text-sm block mb-2">Pattern Detected</span>
                                            <p className="text-white text-sm font-medium">Ascending Triangle (82% Confidence)</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
