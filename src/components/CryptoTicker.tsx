"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

// Mock data as requested
const MOCK_TICKERS = [
    { symbol: "BTC", price: "64,230.50", change: 2.4, icon: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
    { symbol: "ETH", price: "3,450.20", change: 1.8, icon: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
    { symbol: "SOL", price: "145.80", change: 5.2, icon: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
    { symbol: "BNB", price: "580.40", change: -0.5, icon: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
    { symbol: "XRP", price: "0.62", change: 0.4, icon: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
    { symbol: "ADA", price: "0.45", change: -1.2, icon: "https://assets.coingecko.com/coins/images/975/large/cardano.png" },
    { symbol: "DOGE", price: "0.15", change: 8.4, icon: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png" },
    { symbol: "MATIC", price: "0.95", change: 1.1, icon: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png" },
    { symbol: "AVAX", price: "45.20", change: 3.2, icon: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png" },
    { symbol: "DOT", price: "7.10", change: -0.8, icon: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png" },
];

export function CryptoTicker() {
    return (
        <div className="w-full bg-black/80 border-y border-white/10 overflow-hidden py-3 backdrop-blur-md">
            <div className="relative flex max-w-full overflow-hidden">
                <motion.div
                    className="flex whitespace-nowrap pl-4"
                    animate={{ x: "-50%" }}
                    transition={{
                        repeat: Infinity,
                        ease: "linear",
                        duration: 40,
                    }}
                >
                    {/* Double the array for seamless loop */}
                    {[...MOCK_TICKERS, ...MOCK_TICKERS, ...MOCK_TICKERS].map((coin, i) => (
                        <div
                            key={`${coin.symbol}-${i}`}
                            className="flex items-center gap-3 px-8 border-r border-white/10 last:border-0"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={coin.icon} alt={coin.symbol} className="w-5 h-5 rounded-full" />
                            <span className="font-semibold text-white/90">{coin.symbol}</span>
                            <span className="font-mono text-white/70">${coin.price}</span>
                            <span
                                className={`flex items-center text-sm font-medium ${coin.change >= 0 ? "text-green-500" : "text-red-500"
                                    }`}
                            >
                                {coin.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(coin.change)}%
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
