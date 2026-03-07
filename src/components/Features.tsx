"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Trophy, CandlestickChart, Newspaper } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function Features() {
    const features = [
        {
            icon: <BrainCircuit className="w-6 h-6 text-white" />,
            title: "AI Chart Analysis",
            description: "Upload chart screenshots for instant AI-powered insights on trends, support, and resistance levels.",
        },
        {
            icon: <CandlestickChart className="w-6 h-6 text-white" />,
            title: "Virtual Trading",
            description: "Receive $50,000 in virtual capital instantly upon signup and practice trading risk-free.",
        },
        {
            icon: <Trophy className="w-6 h-6 text-white" />,
            title: "Weekly Leaderboard",
            description: "Compete anonymously with thousands of traders worldwide and climb the ranks based on profit.",
        },
        {
            icon: <Newspaper className="w-6 h-6 text-white" />,
            title: "Crypto Market News",
            description: "Stay ahead of the curve with our curated stream of market developments and alpha.",
        },
    ];

    return (
        <section className="py-24 bg-black relative" id="features">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 tracking-tight">
                        Institutional-Grade Tools. <br className="hidden sm:block" />
                        <span className="text-white/50">Zero Risk Involved.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: 0.5,
                                        delay: index * 0.1
                                    }
                                }
                            }}
                            className="h-full"
                        >
                            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
                                <GlowingEffect
                                    spread={40}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                    borderWidth={3}
                                    variant="white"
                                />
                                <div className="relative flex h-full flex-col justify-start overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-[#0A0A0A] p-6 shadow-sm md:p-8">
                                    <div className="relative flex flex-1 flex-col justify-start gap-4">
                                        <motion.div
                                            variants={{
                                                hidden: { opacity: 0, y: 15, scale: 0.9 },
                                                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, delay: index * 0.1 + 0.2 } }
                                            }}
                                            className="w-fit rounded-lg border-[0.75px] border-white/20 bg-white/5 p-2.5 text-white"
                                        >
                                            {feature.icon}
                                        </motion.div>

                                        <div className="space-y-3 mt-2">
                                            <motion.h3
                                                variants={{
                                                    hidden: { opacity: 0, x: -10 },
                                                    visible: { opacity: 1, x: 0, transition: { duration: 0.4, delay: index * 0.1 + 0.3 } }
                                                }}
                                                className="text-xl md:text-2xl font-bold font-sans tracking-tight text-white mb-3"
                                            >
                                                {feature.title}
                                            </motion.h3>

                                            <motion.p
                                                variants={{
                                                    hidden: { opacity: 0, y: 10 },
                                                    visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.1 + 0.4 } }
                                                }}
                                                className="text-white/60 leading-relaxed font-sans font-medium text-[15px]"
                                            >
                                                {feature.description}
                                            </motion.p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
