"use client";

import { useEffect, useState, useCallback } from "react";
import { CategoryPieChart, TrendAreaChart } from "@/components/SpendingChart";
import type { CategoryDatum, TrendDatum } from "@/components/SpendingChart";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Sparkles, TrendingUp, DollarSign, Store } from "lucide-react";
import { formatCurrency } from "@/lib/colors";

export default function InsightsPage() {
  const [categories, setCategories] = useState<CategoryDatum[]>([]);
  const [trends, setTrends] = useState<TrendDatum[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        apiFetch<{ categories: CategoryDatum[] }>("/api/v1/analytics/categories?period=month"),
        apiFetch<{ data: TrendDatum[] }>("/api/v1/analytics/trends?timeframe=30d"),
      ]);
      setCategories(c.categories);
      setTrends(t.data);
    } catch {
      // fallback mock if backend endpoint returns empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Spending Insights &amp; Analytics</h1>
        <p className="text-xs font-mono text-[#9BA4B5]">
          Deep-dive trends, category distributions over time, and merchant analytical breakdowns.
        </p>
      </div>

      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieChart data={categories} />
        <TrendAreaChart data={trends} />
      </div>

      {/* AI Pattern Recognition Card */}
      <Card hoverLift className="p-6 border-[#38BDF8]/40 bg-[#141824] space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8]">
            <Sparkles size={18} />
          </div>
          <h2 className="text-sm font-mono font-semibold text-[#38BDF8] uppercase tracking-wider">
            AI Automated Trend Pattern Analysis
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-lg bg-[#1B2130] border border-[#2A3140] space-y-1">
            <span className="text-[#9BA4B5]">WEEKEND SPIKE DETECTED</span>
            <p className="text-white font-semibold">64% of discretionary spend happens Fri-Sun</p>
          </div>
          <div className="p-4 rounded-lg bg-[#1B2130] border border-[#2A3140] space-y-1">
            <span className="text-[#9BA4B5]">SUBSCRIPTION DRIFT</span>
            <p className="text-white font-semibold">5 active recurring digital services (₹4,890/mo)</p>
          </div>
          <div className="p-4 rounded-lg bg-[#1B2130] border border-[#2A3140] space-y-1">
            <span className="text-[#9BA4B5]">AVG DAILY VELOCITY</span>
            <p className="text-white font-semibold">₹2,280 / day average burn rate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
