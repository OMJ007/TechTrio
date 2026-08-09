"use client";

import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Monthly Income"
        value={summary.total_income}
        icon={<Wallet className="h-4 w-4 text-[#45D6A5]" />}
        change={8.4}
        changeLabel="vs last month"
        isPositiveGood={true}
      />
      <StatCard
        label="Total Expenses"
        value={summary.total_expense}
        icon={<TrendingUp className="h-4 w-4 text-[#F07178]" />}
        change={-3.2}
        changeLabel="vs last month"
        isPositiveGood={false}
      />
      <StatCard
        label="Net Cash Flow"
        value={summary.net_cash_flow}
        icon={isNetPositive ? <TrendingUp className="h-4 w-4 text-[#45D6A5]" /> : <TrendingDown className="h-4 w-4 text-[#F07178]" />}
        change={isNetPositive ? 12.1 : -8.5}
        changeLabel="net balance"
        isPositiveGood={isNetPositive}
      />
      <StatCard
        label="Savings Rate"
        value={`${summary.savings_rate}%`}
        isCurrency={false}
        icon={<PiggyBank className="h-4 w-4 text-[#3B82F6]" />}
        subtitle={summary.savings_rate >= 20 ? "On track for emergency fund" : "Opportunity to save more"}
      />
    </div>
  );
}
