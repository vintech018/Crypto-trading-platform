/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Mono", "monospace"],
      },
      colors: {
        terminal: {
          bg: "#060a12",
          surface: "#0c1220",
          border: "rgba(255,255,255,0.07)",
          muted: "#4a5568",
        },
        "neon-green": "#00e895",
        "neon-red": "#ff4d6d",
        "neon-blue": "#38bdf8",
        "neon-gold": "#f0b429",
        "neon-cyan": "#22d3ee",
        "neon-purple": "#a78bfa",
      },
      boxShadow: {
        "glow-green": "0 0 20px rgba(0,232,149,0.25), 0 0 40px rgba(0,232,149,0.1)",
        "glow-red": "0 0 20px rgba(255,77,109,0.25), 0 0 40px rgba(255,77,109,0.1)",
        "glow-blue": "0 0 20px rgba(56,189,248,0.2)",
        "glow-gold": "0 0 20px rgba(240,180,41,0.2)",
        "card": "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        "inner-glow": "inset 0 0 30px rgba(0,232,149,0.04)",
      },
      backgroundImage: {
        "terminal-gradient":
          "radial-gradient(ellipse at 10% 0%, rgba(0,232,149,0.12), transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(56,189,248,0.10), transparent 50%), linear-gradient(160deg, #060a12 0%, #080e1c 50%, #06111e 100%)",
        "card-glass":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "card-green":
          "linear-gradient(135deg, rgba(0,232,149,0.08) 0%, rgba(0,232,149,0.02) 100%)",
        "card-red":
          "linear-gradient(135deg, rgba(255,77,109,0.08) 0%, rgba(255,77,109,0.02) 100%)",
        "ticker-bar":
          "linear-gradient(90deg, rgba(0,232,149,0.15), rgba(56,189,248,0.10), rgba(167,139,250,0.10))",
      },
      keyframes: {
        "flash-green": {
          "0%": { boxShadow: "0 0 0 0 rgba(0,232,149,0.6)" },
          "50%": { boxShadow: "0 0 0 6px rgba(0,232,149,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0,232,149,0)" },
        },
        "flash-red": {
          "0%": { boxShadow: "0 0 0 0 rgba(255,77,109,0.6)" },
          "50%": { boxShadow: "0 0 0 6px rgba(255,77,109,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,77,109,0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.4, transform: "scale(0.85)" },
        },
        "slide-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { opacity: 0.2, transform: "scale(0.8)" },
          "30%": { opacity: 1, transform: "scale(1.1)" },
        },
        "whale-slide": {
          "0%": { opacity: 0, transform: "translateX(20px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
      },
      animation: {
        "flash-green": "flash-green 0.5s ease-out",
        "flash-red": "flash-red 0.5s ease-out",
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
        "slide-up": "slide-up 0.35s ease-out",
        "shimmer": "shimmer 1.6s linear infinite",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
        "whale-slide": "whale-slide 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
