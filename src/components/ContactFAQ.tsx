"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

export function ContactFAQ() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const faqs = [
        {
            question: "Is Solidus a real trading platform?",
            answer: "No. Solidus is a virtual crypto trading simulator designed for learning and practicing trading strategies without any actual financial risk."
        },
        {
            question: "Do I need real money to use Solidus?",
            answer: "No. Each user receives $50,000 in virtual trading capital to start their journey."
        },
        {
            question: "Is AI analysis financial advice?",
            answer: "No. AI insights on the platform are purely educational and should not be considered or used as financial advice."
        }
    ];

    const toggleAccordion = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-24">
            <h2 className="text-3xl font-display font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
                {faqs.map((faq, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <div
                            key={index}
                            className="w-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden"
                        >
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                            >
                                <span className="font-medium text-lg text-white/90">{faq.question}</span>
                                <motion.div
                                    animate={{ rotate: isActive ? 45 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 ml-4"
                                >
                                    <Plus className="w-4 h-4 text-white hover:text-white" />
                                </motion.div>
                            </button>
                            <AnimatePresence initial={false}>
                                {isActive && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-5 pt-0 text-white/60 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
