"use client";

/**
 * Reads design tokens at runtime so canvas/SVG renderers (Recharts) draw from the
 * same source of truth as CSS.
 *
 * Recharts takes colors as SVG presentation attributes, which do not resolve
 * `var(--token)`. Rather than duplicating hex values into JS — the thing the audit
 * found 680 times — we read the custom property off `:root` and hand Recharts a
 * resolved color string.
 *
 * Tokens are stored as space-separated channels (`19 166 151`), so `rgb(19 166 151)`
 * is a valid CSS color and `rgb(19 166 151 / 0.4)` gives us alpha for free.
 */

/** Resolved token color, e.g. `rgb(19 166 151)`. */
export function token(name: string, alpha?: number): string {
  const channels = read(name);
  if (!channels) return alpha === undefined ? "transparent" : "transparent";
  return alpha === undefined ? `rgb(${channels})` : `rgb(${channels} / ${alpha})`;
}

const cache = new Map<string, string>();

function read(name: string): string | null {
  // During SSR there is no computed style to read; charts are client-only, and
  // the first client paint fills the cache.
  if (typeof window === "undefined") return null;

  const cached = cache.get(name);
  if (cached) return cached;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  if (!value) return null;
  cache.set(name, value);
  return value;
}

/** Chart axis/grid styling shared by every Recharts surface. */
export const chartAxis = () => ({
  tick: {
    fill: token("--ink-muted"),
    fontSize: 12,
    fontFamily: "var(--font-mono)",
  },
  tickLine: false as const,
  axisLine: false as const,
});
