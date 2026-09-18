"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { getCategoryColor } from "@/lib/colors";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "positive" | "negative" | "warning" | "info" | "ai" | "category" | "outline";
  category?: string;
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  category,
  size = "sm",
  className = "",
}) => {
  const sizeStyles = size === "sm" ? "px-2 py-0.5 text-overline" : "px-2.5 py-1 text-label";
  const base = "inline-flex items-center gap-1 rounded-chip border font-medium";

  if (variant === "category" && category) {
    const color = getCategoryColor(category);
    return (
      <span className={`${base} ${color.bgClass} ${color.textClass} ${color.borderClass} ${sizeStyles} ${className}`}>
        {category}
      </span>
    );
  }

  if (variant === "ai") {
    return (
      <span className={`${base} border-accent-400/30 bg-accent/10 text-accent-300 ${sizeStyles} ${className}`}>
        <Sparkles className="h-3 w-3" />
        {children}
      </span>
    );
  }

  const variantStyles = {
    default: "bg-surface-inset text-ink-secondary border-line",
    positive: "bg-positive/10 text-positive border-positive/30",
    negative: "bg-negative/10 text-negative border-negative/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    info: "bg-info/10 text-info border-info/30",
    outline: "bg-transparent text-ink-muted border-line",
  };

  return (
    <span
      className={`${base} ${variantStyles[variant as keyof typeof variantStyles]} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
