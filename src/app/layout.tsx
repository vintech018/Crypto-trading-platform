import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Solidus — AI Crypto Trading Simulator",
  description: "Practice crypto trading risk-free with $50,000 virtual capital and AI-powered chart analysis.",
  openGraph: {
    title: "Solidus — AI Crypto Trading Simulator",
    description: "Practice crypto trading risk-free with $50,000 virtual capital and AI-powered chart analysis.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased text-foreground flex flex-col",
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
