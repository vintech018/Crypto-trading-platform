"use client";

import { UserPlus, Wallet, Trophy } from "lucide-react";
import { Stepper, Step } from "./Stepper";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function HowItWorks() {
    const router = useRouter();

    const steps = [
        {
            icon: <UserPlus className="w-12 h-12 text-white mb-6" />,
            title: "Create Account",
            desc: "Sign up in seconds. No KYC or real money required to start your journey.",
        },
        {
            icon: <Wallet className="w-12 h-12 text-white mb-6" />,
            title: "Receive $50k",
            desc: "Instantly get $50,000 in virtual trading equity into your simulated portfolio.",
        },
        {
            icon: <Trophy className="w-12 h-12 text-white mb-6" />,
            title: "Trade & Climb",
            desc: "Execute trades, use AI analysis, and climb the global weekly leaderboard.",
        },
    ];

    return (
        <section className="py-24 bg-black border-t border-white/10" id="how-it-works">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
                        How It Works
                    </h2>
                    <p className="text-white/60 text-lg">
                        From zero to trading in less than a minute.
                    </p>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    <Stepper
                        initialStep={1}
                        onFinalStepCompleted={() => router.push("/signup")}
                        backButtonText="Previous"
                        nextButtonText="Continue"
                    >
                        {steps.map((step, i) => (
                            <Step key={i}>
                                <div className="flex flex-col items-center text-center py-8">
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                                        className="relative"
                                    >
                                        <div className="absolute inset-0 bg-white/20 blur-[40px] rounded-full" />
                                        {step.icon}
                                    </motion.div>
                                    <motion.h3
                                        initial={{ y: 20, opacity: 0 }}
                                        whileInView={{ y: 0, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="text-3xl font-display font-bold text-white mb-4"
                                    >
                                        {step.title}
                                    </motion.h3>
                                    <motion.p
                                        initial={{ y: 20, opacity: 0 }}
                                        whileInView={{ y: 0, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: 0.3 }}
                                        className="text-white/60 text-lg max-w-sm leading-relaxed"
                                    >
                                        {step.desc}
                                    </motion.p>
                                </div>
                            </Step>
                        ))}
                    </Stepper>
                </div>
            </div>
        </section>
    );
}
