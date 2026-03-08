"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
    return (
        <section className="py-32 bg-black relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                    whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
                        Start Trading Crypto <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30">Risk-Free</span>
                    </h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed"
                    >
                        Join thousands of traders using Solidus to refine their edge and master the markets without risking capital.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href="/signup"
                            className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:gap-4"
                        >
                            Create Account <ArrowRight size={18} />
                        </Link>
                        <Link
                            href="/login"
                            className="w-full sm:w-auto px-8 py-4 bg-transparent text-white font-semibold rounded-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center justify-center"
                        >
                            Login
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
