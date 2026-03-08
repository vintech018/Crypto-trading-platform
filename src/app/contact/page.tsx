import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { ContactInfo } from "@/components/ContactInfo";
import { ContactFAQ } from "@/components/ContactFAQ";
import { DotPattern } from "@/components/DotPattern";

export default function ContactDemoPage() {
    return (
        <main className="min-h-screen bg-black text-white flex flex-col selection:bg-white/30 selection:text-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center">
                {/* Background Pattern */}
                <div className="absolute inset-0 w-full h-full opacity-30 select-none pointer-events-none">
                    <DotPattern className="w-full h-full fill-white/20" />
                </div>

                {/* Gradient Fade for smooth transition */}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none" />

                <div className="container px-6 relative z-10 mx-auto text-center max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm text-white/70 mb-8 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Support Available 24/7
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Contact <span className="text-white/50">Solidus.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                        Have questions about the Solidus platform or need assistance? Our team is ready to help you with any inquiries.
                    </p>
                </div>
            </section>

            {/* Main Content Area */}
            <section className="relative z-20 pb-32 px-6">
                <div className="container mx-auto">
                    {/* The Form */}
                    <ContactForm />

                    {/* The Info Display below Form */}
                    <ContactInfo />

                    {/* FAQs */}
                    <ContactFAQ />
                </div>
            </section>

            <Footer />
        </main>
    );
}
