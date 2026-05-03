"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, CandlestickChart, LogOut } from "lucide-react";
import { api, auth, ApiResponse } from "@/lib/apiClient";

interface WalletData {
    balance: number
    updatedAt: string
}

export default function Dashboard() {
    const [totalValue, setTotalValue] = useState<number | null>(null)
    const [buyingPower, setBuyingPower] = useState<number>(0)
    const [userName, setUserName] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!auth.isLoggedIn()) {
            setLoading(false)
            return
        }

        Promise.all([
            api.get<ApiResponse<{ user: { name: string; email: string } }>>('/api/auth/me'),
            api.get<ApiResponse<{ totalPortfolioValue: number; walletBalance: number }>>('/api/user/portfolio'),
        ])
            .then(([meRes, portRes]) => {
                setUserName(meRes.data?.user?.name ?? '')
                setTotalValue(portRes.data?.totalPortfolioValue ?? 50000)
                setBuyingPower(portRes.data?.walletBalance ?? 50000)
            })
            .catch((err) => {
                console.error("Dashboard data fetch failed", err)
                setTotalValue(0)
                setBuyingPower(0)
            })
            .finally(() => setLoading(false))
    }, [])

    const handleLogout = async () => {
        try {
            // POST with credentials:include so the backend can clear httpOnly cookies
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050'}/api/auth/logout`, {
                method:      'POST',
                credentials: 'include',
                headers:     {
                    'Content-Type':  'application/json',
                    ...(auth.getAccessToken() ? { Authorization: `Bearer ${auth.getAccessToken()}` } : {}),
                },
            })
        } catch {
            // best-effort
        } finally {
            auth.clear()
            window.location.href = '/login'
        }
    }

    const displayBalance = totalValue ?? 0

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none" />

            <Link href="/" className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-colors z-20">
                <ArrowLeft size={16} /> Back to home
            </Link>

            {auth.isLoggedIn() && (
                <button
                    onClick={handleLogout}
                    className="absolute top-8 right-8 text-white/30 hover:text-white flex items-center gap-2 transition-colors z-20 text-sm"
                >
                    <LogOut size={14} /> Log out
                </button>
            )}

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
                    Welcome{userName ? `, ${userName}` : ''} to{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">SOLIDUS</span>
                </h1>

                <p className="text-white/60 text-lg mb-8">
                    {loading
                        ? 'Loading your account…'
                        : "Your account is ready. Welcome to your virtual portfolio."}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                        <p className="text-white/40 text-sm mb-2">Virtual Equity</p>
                        {loading ? (
                            <div className="h-9 w-32 mx-auto bg-white/5 rounded animate-pulse" />
                        ) : (
                            <p className="text-3xl font-mono text-white">
                                ${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                        <p className="text-white/40 text-sm mb-2">Buying Power</p>
                        {loading ? (
                            <div className="h-9 w-32 mx-auto bg-white/5 rounded animate-pulse" />
                        ) : (
                            <p className="text-3xl font-mono text-white">
                                ${buyingPower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/hub" className="px-8 py-4 bg-white text-black font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        <CandlestickChart size={20} /> Start Trading
                    </Link>
                    <Link href="/terminal" className="px-8 py-4 bg-transparent border border-white/20 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <TrendingUp size={20} /> Open Terminal
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
