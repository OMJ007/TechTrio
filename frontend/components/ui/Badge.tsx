"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { getCategoryColor } from "@/lib/colors";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "positive" | "negative" | "warning" | "ai" | "category" | "outline";
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
  const sizeStyles = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  if (variant === "category" && category) {
    const color = getCategoryColor(category);
    return (
      <span
        className={`inline-flex items-center rounded-full font-mono font-medium border ${color.bgClass} ${color.textClass} ${color.borderClass} ${sizeStyles} ${className}`}
      >
        {category}
      </span>
    );
  }

  if (variant === "ai") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-mono font-medium bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 ${sizeStyles} ${className}`}
      >
        <Sparkles className="h-3 w-3 text-[#38BDF8]" />
        {children}
      </span>
    );
  }

  const variantStyles = {
    default: "bg-white/[0.07] text-[#B6BFCE] border border-white/[0.1]",
    positive: "bg-[#45D6A5]/10 text-[#45D6A5] border border-[#45D6A5]/30",
    negative: "bg-[#F07178]/10 text-[#F07178] border border-[#F07178]/30",
    warning: "bg-[#F3B45B]/10 text-[#F3B45B] border border-[#F3B45B]/30",
    outline: "bg-transparent text-[#9BA4B5] border border-[#2A3140]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-medium ${variantStyles[variant as keyof typeof variantStyles]} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
