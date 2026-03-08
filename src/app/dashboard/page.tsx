"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, CandlestickChart } from "lucide-react";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none" />

            <Link href="/" className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors z-20">
                <ArrowLeft size={16} /> Back to home
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-xl w-full"
            >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Wallet className="w-10 h-10 text-green-500" />
                </div>

                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">SOLIDUS</span>
                </h1>

                <p className="text-white/60 text-lg mb-8">
                    Your account has been successfully created. We've credited your virtual portfolio with $50,000 to get you started.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                        <p className="text-white/40 text-sm mb-2">Virtual Equity</p>
                        <p className="text-3xl font-mono text-white">$50,000.00</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                        <p className="text-white/40 text-sm mb-2">Buying Power</p>
                        <p className="text-3xl font-mono text-white">$150,000.00</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/hub" className="px-8 py-4 bg-white text-black font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        <CandlestickChart size={20} /> Start Trading
                    </Link>
                    <button className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <TrendingUp size={20} /> View AI Insights
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
