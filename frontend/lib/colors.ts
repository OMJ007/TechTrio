// ── Category Color System ─────────────────────────────────────────────
// Unified single source of truth for categories across Charts, Badges, and Tables

export interface CategoryColor {
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  Food: {
    hex: "#F3B45B", // warning amber
    bgClass: "bg-[#F3B45B]/10",
    textClass: "text-[#F3B45B]",
    borderClass: "border-[#F3B45B]/20",
  },
  Groceries: {
    hex: "#45D6A5", // positive green
    bgClass: "bg-[#45D6A5]/10",
    textClass: "text-[#45D6A5]",
    borderClass: "border-[#45D6A5]/20",
  },
  Transport: {
    hex: "#38BDF8", // sky blue
    bgClass: "bg-[#38BDF8]/10",
    textClass: "text-[#38BDF8]",
    borderClass: "border-[#38BDF8]/20",
  },
  Bills: {
    hex: "#F07178", // negative red
    bgClass: "bg-[#F07178]/10",
    textClass: "text-[#F07178]",
    borderClass: "border-[#F07178]/20",
  },
  Shopping: {
    hex: "#60A5FA", // violet
    bgClass: "bg-[#60A5FA]/10",
    textClass: "text-[#60A5FA]",
    borderClass: "border-[#60A5FA]/20",
  },
  Healthcare: {
    hex: "#FB7185", // rose
    bgClass: "bg-[#FB7185]/10",
    textClass: "text-[#FB7185]",
    borderClass: "border-[#FB7185]/20",
  },
  Entertainment: {
    hex: "#38BDF8", // accent pink
    bgClass: "bg-[#38BDF8]/10",
    textClass: "text-[#38BDF8]",
    borderClass: "border-[#38BDF8]/20",
  },
  Education: {
    hex: "#3B82F6", // primary indigo
    bgClass: "bg-[#3B82F6]/10",
    textClass: "text-[#3B82F6]",
    borderClass: "border-[#3B82F6]/20",
  },
  Investments: {
    hex: "#2DD4BF", // teal
    bgClass: "bg-[#2DD4BF]/10",
    textClass: "text-[#2DD4BF]",
    borderClass: "border-[#2DD4BF]/20",
  },
  Rent: {
    hex: "#FB923C", // orange
    bgClass: "bg-[#FB923C]/10",
    textClass: "text-[#FB923C]",
    borderClass: "border-[#FB923C]/20",
  },
  Uncategorized: {
    hex: "#9BA4B5", // text-secondary
    bgClass: "bg-[#9BA4B5]/10",
    textClass: "text-[#9BA4B5]",
    borderClass: "border-[#9BA4B5]/20",
  },
};

export function getCategoryColor(category: string): CategoryColor {
  return (
    CATEGORY_COLORS[category] || {
      hex: "#3B82F6",
      bgClass: "bg-[#3B82F6]/10",
      textClass: "text-[#3B82F6]",
      borderClass: "border-[#3B82F6]/20",
    }
  );
}

// ── Financial Formatters ──────────────────────────────────────────────
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
