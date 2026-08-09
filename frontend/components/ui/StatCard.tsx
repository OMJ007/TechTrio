"use client";

import React from "react";
import { Card } from "./Card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/colors";

export interface StatCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  change?: number; // e.g. 12.5 for +12.5%, -5.2 for -5.2%
  changeLabel?: string; // e.g. "vs last month"
  icon?: React.ReactNode;
  subtitle?: string;
  variant?: "surface" | "raised";
  isPositiveGood?: boolean; // if true (default for income), positive change is positive green; if false (e.g. expenses), positive change is negative red
  aiGenerated?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  isCurrency = true,
  change,
  changeLabel = "vs last month",
  icon,
  subtitle,
  variant = "surface",
  isPositiveGood = true,
  aiGenerated = false,
}) => {
  const formattedValue =
    typeof value === "number"
      ? isCurrency
        ? formatCurrency(value)
        : value.toLocaleString()
      : value;

  let trendColor = "text-[#9BA4B5]";
  let trendBg = "bg-[#2A3140]/40";
  let TrendIcon = Minus;

  if (change !== undefined && change !== 0) {
    const isIncrease = change > 0;
    const isGood = isPositiveGood ? isIncrease : !isIncrease;

    if (isGood) {
      trendColor = "text-[#45D6A5]";
      trendBg = "bg-[#45D6A5]/10";
    } else {
      trendColor = "text-[#F07178]";
      trendBg = "bg-[#F07178]/10";
    }

    TrendIcon = isIncrease ? ArrowUpRight : ArrowDownRight;
  }

  return (
    <Card variant={variant} hoverLift className="relative overflow-hidden">
      {aiGenerated && (
        <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
          <div className="bg-[#38BDF8] text-[9px] font-mono font-bold text-black py-0.5 text-center rotate-45 translate-x-3 translate-y-2 shadow-sm">
            AI
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
          {label}
        </span>
        {icon && <div className="text-[#9BA4B5]">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="font-mono text-3xl font-medium tracking-tight text-white tabular-nums">
          {formattedValue}
        </span>
      </div>

      {change !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${trendBg} ${trendColor}`}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`}
          </span>
          <span className="text-xs text-[#9BA4B5]">{changeLabel}</span>
        </div>
      )}

      {subtitle && !change && (
        <p className="mt-2 text-xs text-[#9BA4B5]">{subtitle}</p>
      )}
    </Card>
  );
};
