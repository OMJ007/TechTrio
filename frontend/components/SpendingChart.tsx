"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PieChart as PieIcon, LineChart as LineIcon } from "lucide-react";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategoryColor, formatCurrency } from "@/lib/colors";
import { token } from "@/lib/tokens";

// ── Types ──────────────────────────────────────────────────────────────

export interface CategoryDatum {
  category: string;
  amount: number;
  percentage: number;
}

export interface TrendDatum {
  date: string;
  total_spent: number;
}

// ── Custom Tooltip ──────────────────────────────────────────────────────

function CustomChartTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-[16px] border border-[#2A3140] bg-[#1B2130] px-4 py-2.5 shadow-xl backdrop-blur-md">
        <p className="text-xs font-mono font-semibold text-[#9BA4B5]">
          {data.name || data.payload.date || data.payload.category}
        </p>
        <p className="text-sm font-bold font-mono text-[#3B82F6] tabular-nums">
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
}

// ── Category Pie Chart ─────────────────────────────────────────────────

export function CategoryPieChart({
  data,
  periodSelect,
}: {
  data: CategoryDatum[];
  periodSelect?: React.ReactNode;
}) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Spending by Category" action={periodSelect}>
        <EmptyState
          icon={PieIcon}
          title="No expenses recorded"
          description="Upload receipts or add transactions to visualize your category breakdown."
        />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="Spending by Category" action={periodSelect} height={280}>
      <div className="flex flex-col h-full">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={45}
                paddingAngle={3}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={token(getCategoryColor(entry.category).token)}
                    stroke="#141824"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Grid */}
        <div className="mt-auto pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
          {data.map((d) => {
            const catColor = getCategoryColor(d.category);
            return (
              <div key={d.category} className="flex items-center gap-2 overflow-hidden">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: token(catColor.token) }}
                />
                <span className="truncate text-white font-medium text-xs">{d.category}</span>
                <span className="ml-auto text-[#9BA4B5] font-mono text-xs tabular-nums">
                  {d.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartContainer>
  );
}

// ── Trend Area Chart ───────────────────────────────────────────────────

export function TrendAreaChart({
  data,
  timeframeSelect,
}: {
  data: TrendDatum[];
  timeframeSelect?: React.ReactNode;
}) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Daily Spending Trend" action={timeframeSelect}>
        <EmptyState
          icon={LineIcon}
          title="No trend data available"
          description="Track your daily expenses over time by adding transactions."
        />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="Daily Spending Trend" action={timeframeSelect} height={280}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#2A3140" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9BA4B5", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "#2A3140" }}
          />
          <YAxis
            tick={{ fill: "#9BA4B5", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `₹${v}`}
          />
          <Tooltip content={<CustomChartTooltip />} />
          <Area
            type="monotone"
            dataKey="total_spent"
            stroke="#3B82F6"
            strokeWidth={2.5}
            fill="url(#spendGradient)"
            activeDot={{ r: 6, fill: "#3B82F6", stroke: "#0B0D12", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
