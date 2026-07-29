"use client";

import { Card } from "./Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  icon: React.ElementType;
  variant?: "income" | "expense" | "neutral" | "brand";
  subtext?: string;
}

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  variant = "neutral",
  subtext,
}: StatCardProps) {
  const accentStyles = {
    income: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    expense: {
      text: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      badge: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    brand: {
      text: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
      badge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    neutral: {
      text: "text-slate-100",
      bg: "bg-slate-800/60 border-slate-700/60",
      badge: "text-slate-400 bg-slate-800 border-slate-700",
    },
  };

  const style = accentStyles[variant];

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <p className={`mt-2 text-2xl font-bold font-mono tabular-nums tracking-tight ${style.text}`}>
            {value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl border ${style.bg}`}>
          <Icon size={20} className={style.text} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
        {trend ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                trend.direction === "up"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : trend.direction === "down"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp size={12} />
              ) : trend.direction === "down" ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-[11px] text-slate-500">{trend.label}</span>
            )}
          </div>
        ) : subtext ? (
          <span className="text-xs text-slate-500 truncate">{subtext}</span>
        ) : null}
      </div>
    </Card>
  );
}
