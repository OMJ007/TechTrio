// ── Category Color System ─────────────────────────────────────────────
// Unified single source of truth for categories across Pie Charts, Badges, and Tables

export interface CategoryColor {
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  Food: {
    hex: "#f59e0b", // amber-500
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/20",
  },
  Groceries: {
    hex: "#10b981", // emerald-500
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/20",
  },
  Transport: {
    hex: "#06b6d4", // cyan-500
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
    borderClass: "border-cyan-500/20",
  },
  Bills: {
    hex: "#f43f5e", // rose-500
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/20",
  },
  Shopping: {
    hex: "#8b5cf6", // violet-500
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
    borderClass: "border-violet-500/20",
  },
  Healthcare: {
    hex: "#ef4444", // red-500
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    borderClass: "border-red-500/20",
  },
  Entertainment: {
    hex: "#ec4899", // pink-500
    bgClass: "bg-pink-500/10",
    textClass: "text-pink-400",
    borderClass: "border-pink-500/20",
  },
  Education: {
    hex: "#6366f1", // indigo-500
    bgClass: "bg-indigo-500/10",
    textClass: "text-indigo-400",
    borderClass: "border-indigo-500/20",
  },
  Investments: {
    hex: "#14b8a6", // teal-500
    bgClass: "bg-teal-500/10",
    textClass: "text-teal-400",
    borderClass: "border-teal-500/20",
  },
  Rent: {
    hex: "#f97316", // orange-500
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/20",
  },
  Uncategorized: {
    hex: "#64748b", // slate-500
    bgClass: "bg-slate-500/10",
    textClass: "text-slate-400",
    borderClass: "border-slate-500/20",
  },
};

export function getCategoryColor(category: string): CategoryColor {
  return (
    CATEGORY_COLORS[category] || {
      hex: "#3b82f6", // default blue
      bgClass: "bg-blue-500/10",
      textClass: "text-blue-400",
      borderClass: "border-blue-500/20",
    }
  );
}

// ── Financial Formatters ──────────────────────────────────────────────
export function formatCurrency(amount: number, decimals: number = 2): string {
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `₹${formatted}`;
}
