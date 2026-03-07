import { Navbar } from "@/components/Navbar";
import { CryptoGridDemo } from "@/components/CryptoGridDemo";
import { Footer } from "@/components/Footer";

export default function DemoGridPage() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-12">
                <CryptoGridDemo />
            </div>
            <Footer />
        </div>
    );
}
