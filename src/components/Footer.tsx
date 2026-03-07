import Link from "next/link";
import { Twitter, Github, Linkedin, DiscIcon as Discord } from "lucide-react";

export function Footer() {
    const footerLinks = {
        product: [
            { name: "Features", href: "#features" },
            { name: "Leaderboard", href: "#leaderboard" },
            { name: "News", href: "#news" },
            { name: "AI Analysis", href: "#ai-analysis" },
        ],
        company: [
            { name: "About", href: "/about" },
            { name: "Privacy", href: "/privacy" },
            { name: "Terms", href: "/terms" },
        ],
    };

    return (
        <footer className="bg-black border-t border-white/10 pt-20 pb-10">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
                    <div className="md:col-span-2 space-y-4">
                        <Link href="/" className="inline-block">
                            <span className="font-display font-bold text-2xl tracking-tighter text-white">
                                SOLIDUS<span className="text-white/50">.</span>
                            </span>
                        </Link>
                        <p className="text-white/50 max-w-xs text-sm leading-relaxed">
                            The AI-powered crypto virtual trading simulator. Practice trading risk-free with $50,000 in virtual capital.
                        </p>
                        <div className="flex items-center gap-4 pt-4">
                            <a href="#" className="text-white/50 hover:text-white transition-colors">
                                <Twitter size={20} />
                            </a>
                            <a href="#" className="text-white/50 hover:text-white transition-colors">
                                <Discord size={20} />
                            </a>
                            <a href="#" className="text-white/50 hover:text-white transition-colors">
                                <Github size={20} />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-6">Product</h3>
                        <ul className="space-y-4">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-white/50 hover:text-white text-sm transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-6">Company</h3>
                        <ul className="space-y-4">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-white/50 hover:text-white text-sm transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/40 text-sm">
                        © {new Date().getFullYear()} Solidus. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-white/40 text-sm">All systems operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
