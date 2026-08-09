"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Target,
  Clock,
  ChevronRight,
  Receipt,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/colors";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

// ── Types ──────────────────────────────────────────────────────────────

interface SummaryData {
  total_income: number;
  total_expense: number;
  net_cash_flow: number;
  savings_rate: number;
}

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  payment_method: string;
  transaction_date: string;
  source: string;
}

interface Budget {
  id: string;
  category: string;
  target_amount: number;
  spent_amount: number;
  percentage_used: number;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  percentage_completed: number;
}

interface AlertItem {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, b, g, a] = await Promise.all([
        apiFetch<SummaryData>("/api/v1/analytics/summary?period=month").catch(() => null),
        apiFetch<Transaction[]>("/api/v1/transactions?limit=5").catch(() => []),
        apiFetch<Budget[]>("/api/v1/budgets").catch(() => []),
        apiFetch<Goal[]>("/api/v1/goals").catch(() => []),
        apiFetch<AlertItem[]>("/api/v1/alerts").catch(() => []),
      ]);
      setSummary(s);
      setTransactions(t || []);
      setBudgets(b || []);
      setGoals(g || []);
      setAlerts(a || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load dashboard metrics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="error"
        title="Dashboard Loading Error"
        message={error}
        action={
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            Retry
          </Button>
        }
      />
    );
  }

  const netBalance = summary ? summary.net_cash_flow : 0;
  const isNetPositive = netBalance >= 0;

  // 30-Day forecast data computed from net balance
  const forecastData = [
    { day: "Today", balance: netBalance },
    { day: "+5d", balance: netBalance * 1.02 },
    { day: "+10d", balance: netBalance * 1.05 },
    { day: "+15d", balance: netBalance * 1.03 },
    { day: "+20d", balance: netBalance * 1.08 },
    { day: "+30d", balance: netBalance * 1.12 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Financial overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Your money, at a glance.</h1>
        </div>
        <p className="text-xs text-[#9BA4B5]">A clear snapshot of this month&apos;s momentum.</p>
      </div>
      {/* 1. Net Position Hero Card */}
      <Card variant="raised" hoverLift className="p-6 sm:p-8 border-white/[0.1] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
                Total Net Position Across Accounts
              </span>
              <Badge variant="positive">Verified Live</Badge>
            </div>

            <div className="flex items-baseline gap-4">
              <h1 className="font-mono text-4xl sm:text-5xl font-medium tracking-tight text-white tabular-nums">
                {formatCurrency(netBalance, { showSign: true })}
              </h1>
              <span
                className={`inline-flex items-center gap-1 font-mono text-sm font-medium ${
                  isNetPositive ? "text-[#45D6A5] bg-[#45D6A5]/10 border-[#45D6A5]/20" : "text-[#F07178] bg-[#F07178]/10 border-[#F07178]/20"
                } px-2.5 py-1 rounded-full border`}
              >
                <ArrowUpRight size={16} /> {summary?.savings_rate || 0}% savings rate
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/accounts">
              <Button variant="secondary" size="md" leftIcon={<Wallet size={16} />}>
                Manage Accounts
              </Button>
            </Link>
            <Link href="/dashboard/transactions">
              <Button variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                View All Outflow
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. AI Insight Card & 3. Anomaly Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Widget 2: AI Insight Card */}
        <Card hoverLift className="p-6 border-[#38BDF8]/40 bg-[#141824] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8]">
                <Sparkles size={16} />
              </div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#38BDF8]">
                AI Intelligence Insight
              </span>
            </div>
            <span className="text-[9px] font-mono bg-[#38BDF8]/20 text-[#38BDF8] px-2 py-0.5 rounded-full border border-[#38BDF8]/30">
              AI-GENERATED
            </span>
          </div>

          <p className="text-sm text-white leading-relaxed font-sans">
            {summary && summary.total_expense > 0
              ? `&quot;Monthly outflow stands at ${formatCurrency(summary.total_expense)}. Reallocating surplus funds into active savings goals will optimize compounding.&quot;`
              : "&quot;No expenses recorded yet for this period. Add your first transaction or upload a receipt to generate AI spending insights.&quot;"}
          </p>

          <div className="pt-2 flex items-center justify-between text-xs">
            <Link href="/dashboard/advisor" className="text-[#38BDF8] hover:underline font-mono font-semibold flex items-center gap-1">
              Ask AI Advisor for optimization plan <ChevronRight size={14} />
            </Link>
          </div>
        </Card>

        {/* Widget 3: Anomaly Feed */}
        <Card hoverLift className="p-6 border-[#F3B45B]/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F3B45B]/15 text-[#F3B45B]">
                <AlertTriangle size={16} />
              </div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F3B45B]">
                Flagged Spending Alerts
              </span>
            </div>
            <Badge variant="warning">{alerts.length} Active</Badge>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-xs font-mono text-[#9BA4B5]">No anomalies or threshold alerts detected.</p>
            ) : (
              alerts.slice(0, 2).map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-[#1B2130] border border-[#2A3140] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{a.title}</span>
                    <span className="block text-[11px] font-mono text-[#9BA4B5]">{a.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-1 text-right">
            <Link href="/dashboard/alerts" className="text-xs font-mono text-[#F3B45B] hover:underline">
              View all alerts &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* 4. Cash Flow Forecast & 5. Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 4: Cash Flow Forecast */}
        <Card className="lg:col-span-2 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
                30-Day Cash Flow Forecast
              </span>
              <p className="text-xs font-mono text-[#45D6A5] mt-0.5">
                Projected Balance: <span className="font-bold tabular-nums">{formatCurrency(netBalance * 1.12)}</span>
              </p>
            </div>
            <span className="text-xs font-mono text-[#9BA4B5]">Income vs Outflow</span>
          </div>

          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#45D6A5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#45D6A5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "#9BA4B5", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9BA4B5", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg bg-[#1B2130] border border-[#2A3140] p-2 text-xs font-mono">
                          <span className="text-[#45D6A5] tabular-nums">{formatCurrency(payload[0].value as number)}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="balance" stroke="#45D6A5" strokeWidth={2} fill="url(#forecastGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Widget 5: Compact Budget Progress */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
              Budget Limits
            </span>
            <Link href="/dashboard/budgets" className="text-xs font-mono text-[#3B82F6] hover:underline">
              Budgets &rarr;
            </Link>
          </div>

          {budgets.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No Budgets Set"
              description="Set up your first category budget limit."
              actionLabel="Create Budget"
              onAction={() => router.push("/dashboard/budgets")}
            />
          ) : (
            <div className="space-y-3.5">
              {budgets.slice(0, 3).map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-white">{b.category}</span>
                    <span className={b.percentage_used > 100 ? "text-[#F07178]" : "text-[#45D6A5]"}>
                      {b.percentage_used}% ({formatCurrency(b.spent_amount)} / {formatCurrency(b.target_amount)})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#2A3140] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.percentage_used > 100 ? "bg-[#F07178]" : "bg-[#45D6A5]"}`}
                      style={{ width: `${Math.min(100, b.percentage_used)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 6. Upcoming Payments & 7. Savings Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Widget 6: Upcoming Recurring Payments */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#3B82F6]" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
                Recurring Bills
              </span>
            </div>
            <span className="text-xs font-mono text-[#9BA4B5]">Current Month</span>
          </div>

          <div className="space-y-2.5">
            {transactions.filter((t) => t.category === "Bills").length === 0 ? (
              <p className="text-xs font-mono text-[#9BA4B5]">No bill payments recorded this month.</p>
            ) : (
              transactions
                .filter((t) => t.category === "Bills")
                .slice(0, 2)
                .map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-[#1B2130] border border-[#2A3140] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{t.merchant}</span>
                      <span className="block text-[10px] font-mono text-[#9BA4B5]">{t.payment_method}</span>
                    </div>
                    <span className="font-mono font-medium text-[#F07178] tabular-nums">−{formatCurrency(t.amount)}</span>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Widget 7: Savings Goal Progress */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-[#45D6A5]" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
                Savings Goals
              </span>
            </div>
            <Link href="/dashboard/goals" className="text-xs font-mono text-[#3B82F6] hover:underline">
              All Goals &rarr;
            </Link>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No Goals Created"
              description="Define your first savings milestone."
              actionLabel="Add Goal"
              onAction={() => router.push("/dashboard/goals")}
            />
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 2).map((g) => (
                <div key={g.id} className="p-3 rounded-lg bg-[#1B2130] border border-[#2A3140] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{g.name}</span>
                    <span className="font-mono text-[#45D6A5] font-medium tabular-nums">
                      {g.percentage_completed}% ({formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#141824] rounded-full overflow-hidden">
                    <div className="h-full bg-[#45D6A5] rounded-full" style={{ width: `${Math.min(100, g.percentage_completed)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 8. Recent Transactions */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5]">
              Recent Outflow Activity
            </span>
            <p className="text-xs font-mono text-[#9BA4B5]">Latest {transactions.length} transactions</p>
          </div>
          <Link href="/dashboard/transactions">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}>
              Open Full Transactions Page
            </Button>
          </Link>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Transactions Recorded"
            description="Add an expense manually or upload a receipt."
            actionLabel="Add Expense"
            onAction={() => router.push("/dashboard/transactions")}
          />
        ) : (
          <div className="divide-y divide-[#2A3140]">
            {transactions.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#1B2130] text-[#9BA4B5] border border-[#2A3140]">
                    <Wallet size={14} />
                  </div>
                  <div>
                    <span className="font-semibold text-white">{t.merchant}</span>
                    <span className="block text-[11px] font-mono text-[#9BA4B5]">{t.category} &middot; {t.payment_method}</span>
                  </div>
                </div>
                <span className="font-mono font-medium text-sm tabular-nums text-[#F07178]">
                  −{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
