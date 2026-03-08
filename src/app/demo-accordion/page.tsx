import { ExpandingPanels } from "@/components/ExpandingPanels";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function DemoAccordion() {
    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Navbar />

            <main className="flex-grow flex items-center justify-center py-24 border-y border-white/10 mt-20 relative">
                {/* Abstract background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="w-full relative z-10">
                    <div className="text-center mb-16 px-4">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                            Everything You Need to Learn Crypto Trading
                        </h2>
                        <p className="text-lg md:text-xl text-white/60 font-medium max-w-3xl mx-auto leading-relaxed">
                            Solidus combines virtual trading, AI analysis, and real market insights to help you improve.
                        </p>
                    </div>

                    <ExpandingPanels />
                </div>
            </main>

            <Footer />
        </div>
    );
}
