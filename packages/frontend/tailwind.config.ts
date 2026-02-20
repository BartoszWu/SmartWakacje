import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#141416",
        "bg-raised": "#1e1e22",
        "bg-card": "#222226",
        "bg-card-hover": "#2a2a2f",
        sand: "#e8dcc8",
        "sand-dim": "#a89b88",
        "sand-bright": "#f5efe4",
        accent: "#d4621a",
        "accent-glow": "#e8782f",
        green: "#4caf6a",
        red: "#cf4444",
        gold: "#d4a843",
        blue: "#4a8ec9",
      },
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        body: ['"Libre Franklin"', "Helvetica", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "6px",
      },
      boxShadow: {
        DEFAULT: "0 4px 24px rgba(0,0,0,.45)",
        lg: "0 12px 48px rgba(0,0,0,.6)",
      },
      animation: {
        "card-in": "cardIn 0.55s cubic-bezier(.22,1,.36,1) forwards",
        spin: "spin 0.7s linear infinite",
        pulse: "segPulse 1s ease-in-out infinite",
        "pop-in": "popIn 0.18s ease-out",
      },
      keyframes: {
        cardIn: {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        segPulse: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.9" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(6px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateX(-50%) translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
