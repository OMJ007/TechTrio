import type { Config } from "tailwindcss";

/**
 * Every value here resolves to a CSS custom property declared in
 * `app/globals.css`. Components reference these token names — never a raw hex,
 * and never an arbitrary `[#...]` value.
 *
 * Colors are declared as `rgb(var(--token) / <alpha-value>)` so Tailwind's
 * opacity modifiers keep working: `bg-accent/10`, `text-positive/70`.
 */

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── UI chrome ──────────────────────────────────────────────────
        canvas: token("surface-canvas"),
        surface: {
          DEFAULT: token("surface-base"),
          base: token("surface-base"),
          raised: token("surface-raised"),
          overlay: token("surface-overlay"),
          inset: token("surface-inset"),
        },
        line: {
          DEFAULT: token("line"),
          subtle: token("line-subtle"),
          interactive: token("line-interactive"),
        },
        ink: {
          DEFAULT: token("ink-primary"),
          primary: token("ink-primary"),
          secondary: token("ink-secondary"),
          muted: token("ink-muted"),
        },

        // ── Accent: interactive identity only, never "good" ────────────
        accent: {
          DEFAULT: token("accent-500"),
          300: token("accent-300"),
          400: token("accent-400"),
          500: token("accent-500"),
          600: token("accent-600"),
          700: token("accent-700"),
          ink: token("accent-ink"),
        },

        // ── Semantic: gain / loss / attention / notice ─────────────────
        positive: token("positive"),
        negative: token("negative"),
        warning: token("warning"),
        info: token("info"),

        // ── Spending categories ────────────────────────────────────────
        category: {
          food: token("cat-food"),
          groceries: token("cat-groceries"),
          transport: token("cat-transport"),
          bills: token("cat-bills"),
          rent: token("cat-rent"),
          education: token("cat-education"),
          investments: token("cat-investments"),
          shopping: token("cat-shopping"),
          health: token("cat-health"),
          entertain: token("cat-entertain"),
          uncategorized: token("cat-uncategorized"),
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      /**
       * Type scale.
       *
       * `num-*` are the mono numeral treatments — balances, amounts,
       * percentages, tabular dates. Everything else is Inter. Mono is never
       * used for headings or prose.
       */
      fontSize: {
        // numerals (JetBrains Mono, tabular)
        "num-hero": ["2.5rem",   { lineHeight: "1",    letterSpacing: "-0.02em",  fontWeight: "500" }],
        "num-xl":   ["1.75rem",  { lineHeight: "1.1",  letterSpacing: "-0.015em", fontWeight: "500" }],
        "num-lg":   ["1.25rem",  { lineHeight: "1.2",  letterSpacing: "-0.01em",  fontWeight: "500" }],
        "num-md":   ["0.9375rem",{ lineHeight: "1.4",                             fontWeight: "500" }],
        "num-sm":   ["0.8125rem",{ lineHeight: "1.4",                             fontWeight: "400" }],

        // headings (Inter)
        h1: ["1.625rem", { lineHeight: "1.2",  letterSpacing: "-0.02em",  fontWeight: "600" }],
        h2: ["1.1875rem",{ lineHeight: "1.3",  letterSpacing: "-0.015em", fontWeight: "600" }],
        h3: ["0.9375rem",{ lineHeight: "1.4",  letterSpacing: "-0.01em",  fontWeight: "600" }],

        // prose (Inter) — `body` is the default; the old app set everything to 12px
        "body-lg": ["1rem",      { lineHeight: "1.6",  fontWeight: "400" }],
        body:      ["0.875rem",  { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5",  fontWeight: "400" }],

        // supporting (Inter)
        label:    ["0.75rem",  { lineHeight: "1.35", fontWeight: "500" }],
        caption:  ["0.75rem",  { lineHeight: "1.45", fontWeight: "400" }],
        overline: ["0.6875rem",{ lineHeight: "1.2",  letterSpacing: "0.08em", fontWeight: "600" }],
      },

      /**
       * Spacing — a strict 4px step system. Tailwind's numeric scale already
       * matches it; these aliases give the recurring layout roles a name so
       * they stop drifting (the audit found p-5/p-7/p-9 and space-y-3.5 in use).
       */
      spacing: {
        "stack-xs": "0.25rem",  //  4
        "stack-sm": "0.5rem",   //  8
        stack:      "0.75rem",  // 12
        "stack-md": "1rem",     // 16
        "stack-lg": "1.5rem",   // 24
        "stack-xl": "2rem",     // 32
        "card-pad": "1.5rem",   // 24 — interior padding of every card
        gutter:     "1.5rem",   // 24 — page gutter, mobile
        "gutter-lg":"2.5rem",   // 40 — page gutter, desktop
        section:    "3rem",     // 48 — between major page sections
      },

      /** Three steps. No per-component one-offs. */
      borderRadius: {
        chip: "var(--radius-chip)",    //  8px — badges, inputs, buttons
        card: "var(--radius-card)",    // 14px — cards, tables, charts
        modal: "var(--radius-modal)",  // 20px — modals, sheets, popovers
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
