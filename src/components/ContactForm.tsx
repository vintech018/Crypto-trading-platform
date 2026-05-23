"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function ContactForm() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "General Inquiry",
        message: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        if (!formData.message.trim()) newErrors.message = "Message is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            setIsSubmitting(true);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSubmitting(false);
            setIsSuccess(true);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-10 flex flex-col items-center justify-center text-center space-y-6"
            >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white">Message Sent Successfully</h3>
                <p className="text-white/60 text-lg">
                    Thank you for contacting Solidus. <br />
                    Our team will review your message and respond shortly.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-8 px-6 py-3 rounded-full border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-300"
                >
                    Send Another Message
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-white/80">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all`}
                        placeholder="John Doe"
                    />
                    <AnimatePresence>
                        {errors.name && (
                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-400 text-sm mt-1">{errors.name}</motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-white/80">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all`}
                        placeholder="john@example.com"
                    />
                    <AnimatePresence>
                        {errors.email && (
                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-400 text-sm mt-1">{errors.email}</motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium text-white/80">Subject</label>
                    <div className="relative">
                        <select
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="General Inquiry" className="bg-black text-white">General Inquiry</option>
                            <option value="Technical Issue" className="bg-black text-white">Technical Issue</option>
                            <option value="Feedback" className="bg-black text-white">Feedback</option>
                            <option value="Partnership" className="bg-black text-white">Partnership</option>
                            <option value="Other" className="bg-black text-white">Other</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium text-white/80">Message</label>
                    <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={5}
                        className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.message ? 'border-red-500/50' : 'border-white/10'} text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none`}
                        placeholder="Write your message here..."
                    />
                    <AnimatePresence>
                        {errors.message && (
                            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-400 text-sm mt-1">{errors.message}</motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-center mt-4">
                    <InteractiveHoverButton
                        type="submit"
                        disabled={isSubmitting}
                        text={isSubmitting ? "Sending..." : "Send Message"}
                        className={`${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                </div>
            </form>
        </motion.div>
    );
}
