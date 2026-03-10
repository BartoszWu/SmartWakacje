import type { Config } from "tailwindcss";

function rgb(varName: string) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: rgb("--color-bg"),
        "bg-raised": rgb("--color-bg-raised"),
        "bg-card": rgb("--color-bg-card"),
        "bg-card-hover": rgb("--color-bg-card-hover"),
        sand: rgb("--color-sand"),
        "sand-dim": rgb("--color-sand-dim"),
        "sand-bright": rgb("--color-sand-bright"),
        accent: rgb("--color-accent"),
        "accent-glow": rgb("--color-accent-glow"),
        green: rgb("--color-green"),
        red: rgb("--color-red"),
        gold: rgb("--color-gold"),
        blue: rgb("--color-blue"),
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
        DEFAULT: "var(--shadow-default)",
        lg: "var(--shadow-lg)",
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
