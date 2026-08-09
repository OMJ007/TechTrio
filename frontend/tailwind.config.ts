import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0D12",
        surface: {
          DEFAULT: "#141824",
          raised: "#1B2130",
        },
        border: "#2A3140",
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          muted: "rgba(59, 130, 246, 0.12)",
        },
        secondary: "#F3F5FA",
        accent: {
          DEFAULT: "#38BDF8",
          muted: "rgba(56, 189, 248, 0.12)",
        },
        "text-primary": "#F3F5FA",
        "text-secondary": "#9BA4B5",
        positive: {
          DEFAULT: "#45D6A5",
          muted: "rgba(69, 214, 165, 0.12)",
        },
        negative: {
          DEFAULT: "#F07178",
          muted: "rgba(240, 113, 120, 0.12)",
        },
        warning: {
          DEFAULT: "#F3B45B",
          muted: "rgba(243, 180, 91, 0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        card: "16px",
        control: "8px",
        pill: "9999px",
      },
      spacing: {
        base: "8px",
        gap: "16px",
        card: "24px",
        section: "80px",
      },
      fontSize: {
        "display-lg": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1", letterSpacing: "-0.055em", fontWeight: "650" }],
        "display-md": ["clamp(2rem, 4vw, 3.25rem)", { lineHeight: "1.05", letterSpacing: "-0.045em", fontWeight: "650" }],
        "heading": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.025em", fontWeight: "650" }],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
