import { Mail, Clock, ShieldQuestion } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export function ContactInfo() {
    const infos = [
        {
            icon: <Mail className="w-6 h-6 text-white" />,
            title: "Email Support",
            detail: "support@solidus.ai",
            href: "mailto:support@solidus.ai",
        },
        {
            icon: <Clock className="w-6 h-6 text-white" />,
            title: "Response Time",
            detail: "We typically respond within 24 hours.",
        },
        {
            icon: <ShieldQuestion className="w-6 h-6 text-white" />,
            title: "Platform Support",
            detail: "For questions related to virtual trading, AI analysis, or leaderboard rankings.",
        }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto mt-24">
            <div className="text-center mb-12">
                <h2 className="text-2xl font-display font-semibold text-white">Need immediate assistance?</h2>
                <p className="text-white/50 mt-2">Here are the different ways our team can help you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {infos.map((info, idx) => (
                    <SpotlightCard
                        key={idx}
                        className="p-8 h-full"
                    >
                        <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5 mx-auto">
                            {info.icon}
                        </div>
                        <h3 className="text-lg font-medium text-white">{info.title}</h3>
                        {info.href ? (
                            <a href={info.href} className="text-white/70 hover:text-white transition-colors">
                                {info.detail}
                            </a>
                        ) : (
                            <p className="text-white/70 text-sm leading-relaxed">{info.detail}</p>
                        )}
                    </SpotlightCard>
                ))}
            </div>
        </div>
    );
}
