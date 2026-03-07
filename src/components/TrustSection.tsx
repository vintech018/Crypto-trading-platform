"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, motion } from "framer-motion";

function AnimatedStat({ value, label, prefix = "", suffix = "" }: { value: number, label: string, prefix?: string, suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (inView && ref.current) {
            animate(0, value, {
                duration: 2,
                ease: "easeOut",
                onUpdate: (latest) => {
                    if (ref.current) {
                        ref.current.textContent = `${prefix}${Math.floor(latest)}${suffix}`;
                    }
                }
            });
        }
    }, [inView, value, prefix, suffix]);

    return (
        <div className="flex flex-col items-center p-6 border border-white/5 rounded-2xl bg-white/[0.01]">
            <span ref={ref} className="text-4xl md:text-5xl font-mono font-bold text-white mb-2">
                {prefix}0{suffix}
            </span>
            <span className="text-white/50 font-medium text-sm uppercase tracking-wider text-center">
                {label}
            </span>
        </div>
    );
}

export function TrustSection() {
    const stats = [
        { value: 50, prefix: "", suffix: "K+", label: "Simulated Trades Executed" },
        { value: 10, prefix: "", suffix: "K+", label: "Active Traders Practicing" },
        { value: 50, prefix: "$", suffix: "M+", label: "Virtual Trading Volume" },
        { value: 0, prefix: "", suffix: "", label: "Real Money Risked" },
    ];

    return (
        <section className="py-24 bg-black border-y border-white/10 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-6 max-w-6xl relative z-10 text-center">
                <h2 className="text-2xl md:text-4xl font-display font-medium text-white mb-16">
                    <span className="inline-block overflow-hidden pb-1">
                        {"The future of".split("").map((char, i) => (
                            <motion.span
                                key={`str1-${i}`}
                                initial={{ y: "100%" }}
                                whileInView={{ y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.02, ease: [0.33, 1, 0.68, 1] }}
                                className={char === " " ? "inline-block w-2 md:w-3" : "inline-block"}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </span>
                    <br className="hidden sm:block" />
                    <span className="inline-block overflow-hidden pb-2">
                        {"AI-powered crypto learning.".split("").map((char, i) => (
                            <motion.span
                                key={`str2-${i}`}
                                initial={{ y: "100%" }}
                                whileInView={{ y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.3 + i * 0.02, ease: [0.33, 1, 0.68, 1] }}
                                className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 ${char === " " ? "inline-block w-2 md:w-3" : "inline-block"}`}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </span>
                </h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-4">
                    {stats.map((stat, i) => (
                        <AnimatedStat key={i} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
}
