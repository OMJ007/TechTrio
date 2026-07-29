"use client";

import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/colors";

export interface SummaryData {
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
  savings_rate: number;
}

interface SummaryCardsProps {
  summary: SummaryData;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const isNetPositive = summary.net_cash_flow >= 0;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Monthly Income"
        value={formatCurrency(summary.total_income)}
        icon={Wallet}
        variant="income"
        trend={{
          value: "+Income",
          direction: "up",
          label: "this period",
        }}
      />
      <StatCard
        title="Total Expenses"
        value={formatCurrency(summary.total_expense)}
        icon={TrendingUp}
        variant="expense"
        trend={{
          value: "-Outflow",
          direction: "down",
          label: "this period",
        }}
      />
      <StatCard
        title="Net Cash Flow"
        value={`${isNetPositive ? "+" : ""}${formatCurrency(summary.net_cash_flow)}`}
        icon={isNetPositive ? TrendingUp : TrendingDown}
        variant={isNetPositive ? "income" : "expense"}
        trend={{
          value: isNetPositive ? "Surplus" : "Deficit",
          direction: isNetPositive ? "up" : "down",
          label: "net position",
        }}
      />
      <StatCard
        title="Savings Rate"
        value={`${summary.savings_rate}%`}
        icon={PiggyBank}
        variant="brand"
        subtext={`${summary.savings_rate >= 20 ? "Healthy savings buffer" : "Opportunity to save more"}`}
      />
    </div>
  );
}
