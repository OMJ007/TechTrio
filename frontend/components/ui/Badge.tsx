"use client";

import { getCategoryColor } from "@/lib/colors";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "category" | "income" | "expense" | "warning" | "neutral" | "info";
  categoryName?: string;
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = "neutral",
  categoryName,
  size = "md",
  className = "",
  icon,
}: BadgeProps) {
  let colorStyles = "bg-slate-800 text-slate-300 border-slate-700/80";

  if (variant === "category" && categoryName) {
    const color = getCategoryColor(categoryName);
    colorStyles = `${color.bgClass} ${color.textClass} ${color.borderClass}`;
  } else if (variant === "income") {
    colorStyles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (variant === "expense") {
    colorStyles = "bg-rose-500/10 text-rose-400 border-rose-500/20";
  } else if (variant === "warning") {
    colorStyles = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  } else if (variant === "info") {
    colorStyles = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  }

  const sizeStyles =
    size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border border-financial ${colorStyles} ${sizeStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
