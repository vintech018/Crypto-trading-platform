import dynamic from 'next/dynamic'
import { Navbar } from "@/components/Navbar";
import { CryptoTicker } from "@/components/CryptoTicker";
import { TerminalPreview } from "@/components/TerminalPreview";
import CryptoGrid from "@/components/CryptoGrid";
import { ExpandingPanels } from "@/components/ExpandingPanels";
import { Features } from "@/components/Features";
import { AIShowcase } from "@/components/AIShowcase";
import { HowItWorks } from "@/components/HowItWorks";
import { LeaderboardPreview } from "@/components/LeaderboardPreview";
import { TrustSection } from "@/components/TrustSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Hero = dynamic(() => import('@/components/Hero').then(mod => mod.Hero), {
    ssr: false,
    loading: () => <div className="min-h-screen bg-black" />
})

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <CryptoTicker />
      <TerminalPreview />
      <div className="bg-black">
        <CryptoGrid />

        <section className="py-24 relative overflow-hidden bg-black border-y border-white/5 mt-10">
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
        </section>

        <Features />
        <AIShowcase />
        <HowItWorks />
        <TrustSection />
        <LeaderboardPreview />
        <CTA />
      </div>
      <Footer />
    </>
  );
}
