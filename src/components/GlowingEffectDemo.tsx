"use client";

import { BrainCircuit, CandlestickChart, Trophy, Newspaper } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

export function GlowingEffectDemo() {
    return (
        <div className="py-20 flex flex-col items-center justify-center bg-black">
            <div className="w-full max-w-5xl px-4 md:px-8">
                <h2 className="mb-12 text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                    Institutional-Grade Tools.<br />
                    <span className="text-muted-foreground whitespace-pre-wrap">Zero Risk Involved.</span>
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GridItem
                        icon={<BrainCircuit className="h-5 w-5 md:h-6 md:w-6" />}
                        title="AI Chart Analysis"
                        description="Upload chart screenshots for instant AI-powered insights on trends, support, and resistance levels."
                    />
                    <GridItem
                        icon={<CandlestickChart className="h-5 w-5 md:h-6 md:w-6" />}
                        title="Virtual Trading"
                        description="Receive $50,000 in virtual capital instantly upon signup and practice trading risk-free."
                    />
                    <GridItem
                        icon={<Trophy className="h-5 w-5 md:h-6 md:w-6" />}
                        title="Weekly Leaderboard"
                        description="Compete anonymously with thousands of traders worldwide and climb the ranks based on profit."
                    />
                    <GridItem
                        icon={<Newspaper className="h-5 w-5 md:h-6 md:w-6" />}
                        title="Crypto Market News"
                        description="Stay ahead of the curve with our curated stream of market developments and alpha."
                    />
                </ul>
            </div>
        </div>
    );
}

interface GridItemProps {
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
}

const GridItem = ({ icon, title, description }: GridItemProps) => {
    return (
        <li className={cn("min-h-[14rem] list-none")}>
            <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border-[0.75px] bg-[#0A0A0A] p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:p-8">
                    <div className="relative flex flex-1 flex-col justify-start gap-4">
                        <div className="w-fit rounded-lg border-[0.75px] border-border bg-muted/30 p-2.5 text-white">
                            {icon}
                        </div>
                        <div className="space-y-3 mt-2">
                            <h3 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-white">
                                {title}
                            </h3>
                            <p className="font-sans text-sm md:text-[15px] leading-relaxed text-muted-foreground/90 font-medium">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};
