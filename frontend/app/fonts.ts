/**
 * Application typefaces.
 *
 * Both faces are self-hosted by `next/font` at build time — no network request to
 * Google, no FOUT, and no layout shift (Next generates a metric-compatible fallback
 * automatically). Before this, `--font-sans`/`--font-mono` named Inter and JetBrains
 * Mono without ever loading them, so the app silently rendered in whatever the OS
 * happened to have (Segoe UI + Consolas on Windows).
 */

import { Inter, JetBrains_Mono } from "next/font/google";

/** Prose, UI labels, headings, advisor chat. */
export const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  // 400 body, 500 UI labels, 600 headings/emphasis
  weight: ["400", "500", "600"],
});

/** Numerals only — balances, amounts, percentages, tabular dates. */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});
