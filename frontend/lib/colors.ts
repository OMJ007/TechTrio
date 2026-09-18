// ── Category color system ─────────────────────────────────────────────
// Single source of truth for category color across charts, badges and tables.
//
// Colors themselves live in `app/globals.css` as design tokens. This file only
// maps a category name onto its token — no hex values.
//
// Each category owns its own hue *and* its own rung on a 10-step lightness
// ladder. Lightness is the one channel that survives all three dichromacies, so
// the ladder is what keeps these legible for colorblind users.
//
// Rule: color is never the only encoding. Eleven categories cannot be made
// reliably distinguishable by hue alone once red, green, amber and teal are
// reserved for meaning — so always pair the color with a text label.

export interface CategoryColor {
  /** CSS custom property, for runtime lookup by chart renderers. */
  token: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  /** Tailwind class that fills with the category color (swatches, bars). */
  fillClass: string;
}

/** Class names are written out in full — Tailwind cannot see interpolated names. */
export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  Food: {
    token: "--cat-food",
    bgClass: "bg-category-food/10",
    textClass: "text-category-food",
    borderClass: "border-category-food/25",
    fillClass: "bg-category-food",
  },
  Groceries: {
    token: "--cat-groceries",
    bgClass: "bg-category-groceries/10",
    textClass: "text-category-groceries",
    borderClass: "border-category-groceries/25",
    fillClass: "bg-category-groceries",
  },
  Transport: {
    token: "--cat-transport",
    bgClass: "bg-category-transport/10",
    textClass: "text-category-transport",
    borderClass: "border-category-transport/25",
    fillClass: "bg-category-transport",
  },
  Bills: {
    token: "--cat-bills",
    bgClass: "bg-category-bills/10",
    textClass: "text-category-bills",
    borderClass: "border-category-bills/25",
    fillClass: "bg-category-bills",
  },
  Shopping: {
    token: "--cat-shopping",
    bgClass: "bg-category-shopping/10",
    textClass: "text-category-shopping",
    borderClass: "border-category-shopping/25",
    fillClass: "bg-category-shopping",
  },
  Healthcare: {
    token: "--cat-health",
    bgClass: "bg-category-health/10",
    textClass: "text-category-health",
    borderClass: "border-category-health/25",
    fillClass: "bg-category-health",
  },
  Entertainment: {
    token: "--cat-entertain",
    bgClass: "bg-category-entertain/10",
    textClass: "text-category-entertain",
    borderClass: "border-category-entertain/25",
    fillClass: "bg-category-entertain",
  },
  Education: {
    token: "--cat-education",
    bgClass: "bg-category-education/10",
    textClass: "text-category-education",
    borderClass: "border-category-education/25",
    fillClass: "bg-category-education",
  },
  Investments: {
    token: "--cat-investments",
    bgClass: "bg-category-investments/10",
    textClass: "text-category-investments",
    borderClass: "border-category-investments/25",
    fillClass: "bg-category-investments",
  },
  Rent: {
    token: "--cat-rent",
    bgClass: "bg-category-rent/10",
    textClass: "text-category-rent",
    borderClass: "border-category-rent/25",
    fillClass: "bg-category-rent",
  },
  Uncategorized: {
    token: "--cat-uncategorized",
    bgClass: "bg-category-uncategorized/10",
    textClass: "text-category-uncategorized",
    borderClass: "border-category-uncategorized/25",
    fillClass: "bg-category-uncategorized",
  },
};

export function getCategoryColor(category: string): CategoryColor {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Uncategorized;
}

// ── Financial formatters ──────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  options?: {
    showSign?: boolean;
    currencySymbol?: string;
    decimals?: number;
  }
): string {
  const { showSign = false, currencySymbol = "₹", decimals = 2 } = options || {};
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (showSign) {
    const sign = amount >= 0 ? "+" : "−";
    return `${sign}${currencySymbol}${formatted}`;
  }

  return `${currencySymbol}${formatted}`;
}

/**
 * Compact form for chart axes — ₹1.2L, ₹45k. Indian numbering, since the axis
 * has no room for `₹1,20,000.00`.
 */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}₹${Math.round(abs / 1e3)}k`;
  return `${sign}₹${Math.round(abs)}`;
}
