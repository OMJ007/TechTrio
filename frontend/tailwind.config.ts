import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        surface: {
          950: "#070a11",
          900: "#0b0f17",
          850: "#101623",
          800: "#151d2f",
          750: "#1c263c",
          700: "#25324e",
        },
        financial: {
          income: "#10b981",
          incomeMuted: "rgba(16, 185, 129, 0.12)",
          expense: "#f43f5e",
          expenseMuted: "rgba(244, 63, 94, 0.12)",
          warning: "#f59e0b",
          warningMuted: "rgba(245, 158, 11, 0.12)",
          info: "#0ea5e9",
          infoMuted: "rgba(14, 165, 233, 0.12)",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;

