import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Guide v1.2 palette
        bg: {
          DEFAULT: "#0A0806",
          soft: "#14110D",
          warm: "#1A1410",
        },
        fire: {
          DEFAULT: "#FF6B1A",
          deep: "#D44A00",
          glow: "#FF8A3D",
        },
        gold: {
          DEFAULT: "#F5C842",
          deep: "#C8951C",
        },
        saffron: "#FFB700",
        rice: {
          DEFAULT: "#F5ECD5",
          soft: "#D8CBA6",
          dim: "#8A7E60",
        },
      },
      fontFamily: {
        display: ['"Bagel Fat One"', "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        body: ['"Geist"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      animation: {
        "ember-float": "ember-float 6s ease-in-out infinite",
        "fire-flicker": "fire-flicker 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
      keyframes: {
        "ember-float": {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.6" },
          "50%": { transform: "translateY(-30px) scale(1.1)", opacity: "1" },
        },
        "fire-flicker": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.15)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "fire-gradient": "linear-gradient(135deg, #FF6B1A 0%, #FFB700 50%, #F5C842 100%)",
        "ember-radial": "radial-gradient(circle at 50% 50%, rgba(255,107,26,0.15) 0%, transparent 70%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(245,200,66,0.3) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
