"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
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
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatCompact } from "@/lib/colors";
import { token } from "@/lib/tokens";
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

// ── Local pieces ───────────────────────────────────────────────────────

function SectionLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <span className="flex items-center gap-2 text-overline uppercase text-ink-muted">
      {Icon && <Icon size={14} className="text-ink-muted" />}
      {children}
    </span>
  );
}

/** Marks a figure the app generated rather than measured. */
function IllustrativeTag() {
  return (
    <span className="illustrative-outline inline-flex items-center gap-1.5 rounded-chip bg-surface-inset/60 px-2 py-1 text-overline uppercase text-ink-muted">
      <span className="illustrative-fill h-2.5 w-2.5 rounded-[2px] bg-surface-inset" />
      Illustrative
    </span>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
  delta,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  delta?: React.ReactNode;
}) {
  const valueTone = {
    positive: "text-positive",
    negative: "text-negative",
    neutral: "text-ink-primary",
  }[tone];

  return (
    <Card>
      <SectionLabel>{label}</SectionLabel>
      <p className={`mt-stack-sm font-mono text-num-xl tabular-nums ${valueTone}`}>{value}</p>
      {delta && <div className="mt-stack-sm">{delta}</div>}
    </Card>
  );
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

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Alert
        variant="error"
        title="Dashboard didn't load"
        message={error}
        action={
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            Try again
          </Button>
        }
      />
    );
  }

  const netBalance = summary ? summary.net_cash_flow : 0;
  const isNetPositive = netBalance >= 0;
  const billTransactions = transactions.filter((t) => t.category === "Bills");

  // NOTE: these multipliers are invented — there is no forecast endpoint yet, so
  // the widget is tagged Illustrative rather than presented as a measurement.
  const forecastData = [
    { day: "Today", balance: netBalance },
    { day: "+5d", balance: netBalance * 1.02 },
    { day: "+10d", balance: netBalance * 1.05 },
    { day: "+15d", balance: netBalance * 1.03 },
    { day: "+20d", balance: netBalance * 1.08 },
    { day: "+30d", balance: netBalance * 1.12 },
  ];

  return (
    <div className="space-y-stack-lg">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-overline uppercase text-ink-muted">Financial overview</p>
          <h1 className="mt-1 text-h1 text-ink-primary">Your money, at a glance.</h1>
        </div>
        <p className="text-body-sm text-ink-muted">A clear snapshot of this month&apos;s momentum.</p>
      </div>

      {/* ── 1. Net position — the one number the eye should hit ──── */}
      <Card variant="raised">
        <div className="flex flex-col justify-between gap-stack-lg md:flex-row md:items-center">
          <div>
            <SectionLabel>Net position · this month</SectionLabel>
            <div className="mt-stack-sm flex flex-wrap items-baseline gap-stack">
              <p className="font-mono text-num-hero tabular-nums text-ink-primary">
                {formatCurrency(netBalance, { showSign: true })}
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-chip border px-2 py-1 font-mono text-num-sm tabular-nums ${
                  isNetPositive
                    ? "border-positive/25 bg-positive/10 text-positive"
                    : "border-negative/25 bg-negative/10 text-negative"
                }`}
              >
                {isNetPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {summary?.savings_rate ?? 0}% saved
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-stack-sm">
            <Link href="/dashboard/accounts">
              <Button variant="outline" size="md" leftIcon={<Wallet size={16} />}>
                Manage accounts
              </Button>
            </Link>
            <Link href="/dashboard/transactions">
              <Button variant="primary" size="md" rightIcon={<ArrowRight size={16} />}>
                View transactions
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* ── 2. Supporting figures (were fetched but never shown) ─── */}
      <div className="grid gap-stack-md sm:grid-cols-3">
        <Stat label="Income" value={formatCurrency(summary?.total_income ?? 0)} tone="positive" />
        <Stat label="Outflow" value={formatCurrency(summary?.total_expense ?? 0)} tone="negative" />
        <Stat
          label="Savings rate"
          value={`${summary?.savings_rate ?? 0}%`}
          delta={
            <p className="text-body-sm text-ink-muted">
              {(summary?.savings_rate ?? 0) >= 20
                ? "On track for an emergency fund."
                : "Room to save more this month."}
            </p>
          }
        />
      </div>

      {/* ── 3. Attention: alerts and the AI read ─────────────────── */}
      <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <SectionLabel icon={AlertTriangle}>Flagged spending</SectionLabel>
            {alerts.length > 0 && <Badge variant="warning">{alerts.length} active</Badge>}
          </div>

          <div className="mt-stack-md flex-1 space-y-stack-sm">
            {alerts.length === 0 ? (
              <p className="text-body-sm text-ink-muted">
                Nothing flagged. Threshold and anomaly alerts appear here.
              </p>
            ) : (
              alerts.slice(0, 2).map((a) => (
                <div key={a.id} className="rounded-chip border border-line-subtle bg-surface-raised p-stack">
                  <p className="text-h3 text-ink-primary">{a.title}</p>
                  <p className="mt-0.5 text-body-sm text-ink-muted">{a.message}</p>
                </div>
              ))
            )}
          </div>

          {alerts.length > 0 && (
            <Link
              href="/dashboard/alerts"
              className="mt-stack-md inline-flex items-center gap-1 self-start text-label text-accent-300 hover:underline"
            >
              View all alerts <ChevronRight size={14} />
            </Link>
          )}
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <SectionLabel icon={Sparkles}>AI insight</SectionLabel>
            <Badge variant="ai">Generated</Badge>
          </div>

          <p className="mt-stack-md flex-1 text-body text-ink-secondary">
            {summary && summary.total_expense > 0
              ? `Monthly outflow stands at ${formatCurrency(summary.total_expense)}. Moving surplus into an active savings goal would put it to work.`
              : "No expenses recorded yet for this period. Add a transaction or upload a receipt and insights will appear here."}
          </p>

          <Link
            href="/dashboard/advisor"
            className="mt-stack-md inline-flex items-center gap-1 self-start text-label text-accent-300 hover:underline"
          >
            Ask the advisor for a plan <ChevronRight size={14} />
          </Link>
        </Card>
      </div>

      {/* ── 4. Forecast + budgets ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-stack-md lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-stack-sm">
            <div>
              <SectionLabel>30-day cash flow</SectionLabel>
              <p className="mt-stack-sm font-mono text-num-lg tabular-nums text-ink-muted">
                {formatCurrency(netBalance * 1.12)}
              </p>
            </div>
            <IllustrativeTag />
          </div>

          <div className="illustrative-outline mt-stack-md rounded-chip p-stack-sm">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <pattern id="forecastHatch" width="7" height="7" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="7" stroke={token("--illustrative-hatch", 0.35)} strokeWidth="2" />
                    </pattern>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: token("--ink-muted"), fontSize: 12, fontFamily: "var(--font-mono)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: token("--ink-muted"), fontSize: 12, fontFamily: "var(--font-mono)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompact}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ stroke: token("--line-interactive"), strokeWidth: 1 }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="elev-overlay rounded-chip px-3 py-2">
                          <p className="font-mono text-num-sm tabular-nums text-ink-secondary">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                          <p className="text-overline uppercase text-ink-muted">Illustrative</p>
                        </div>
                      ) : null
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={token("--line-interactive")}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="url(#forecastHatch)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-stack-sm text-body-sm text-ink-muted">
            A placeholder shape, not a prediction — Xpense has no forecasting model yet.
          </p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <SectionLabel>Budget limits</SectionLabel>
            <Link href="/dashboard/budgets" className="text-label text-accent-300 hover:underline">
              All budgets
            </Link>
          </div>

          {budgets.length === 0 ? (
            <div className="mt-stack-md flex-1">
              <EmptyState
                icon={Target}
                title="No budgets yet"
                description="Set a category limit to track spending against it."
                actionLabel="Create a budget"
                onAction={() => router.push("/dashboard/budgets")}
              />
            </div>
          ) : (
            <div className="mt-stack-md space-y-stack-md">
              {budgets.slice(0, 3).map((b) => {
                const over = b.percentage_used > 100;
                const near = !over && b.percentage_used >= 80;
                return (
                  <div key={b.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-body-sm text-ink-primary">{b.category}</span>
                      <span
                        className={`font-mono text-num-sm tabular-nums ${
                          over ? "text-negative" : near ? "text-warning" : "text-ink-muted"
                        }`}
                      >
                        {b.percentage_used}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-chip bg-surface-inset">
                      <div
                        className={`h-full rounded-chip ${
                          over ? "bg-negative" : near ? "bg-warning" : "bg-positive"
                        }`}
                        style={{ width: `${Math.min(100, b.percentage_used)}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-num-sm tabular-nums text-ink-muted">
                      {formatCurrency(b.spent_amount)} of {formatCurrency(b.target_amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── 5. Bills + goals ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <SectionLabel icon={Clock}>Recurring bills</SectionLabel>
            <span className="text-caption text-ink-muted">This month</span>
          </div>

          <div className="mt-stack-md space-y-stack-sm">
            {billTransactions.length === 0 ? (
              <p className="text-body-sm text-ink-muted">No bill payments recorded this month.</p>
            ) : (
              billTransactions.slice(0, 2).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-chip border border-line-subtle bg-surface-raised p-stack"
                >
                  <div>
                    <p className="text-body-sm text-ink-primary">{t.merchant}</p>
                    <p className="text-caption text-ink-muted">{t.payment_method}</p>
                  </div>
                  <span className="font-mono text-num-md tabular-nums text-negative">
                    −{formatCurrency(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <SectionLabel icon={Target}>Savings goals</SectionLabel>
            <Link href="/dashboard/goals" className="text-label text-accent-300 hover:underline">
              All goals
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="mt-stack-md flex-1">
              <EmptyState
                icon={Target}
                title="No goals yet"
                description="Name what you're saving for and track progress toward it."
                actionLabel="Add a goal"
                onAction={() => router.push("/dashboard/goals")}
              />
            </div>
          ) : (
            <div className="mt-stack-md space-y-stack-md">
              {goals.slice(0, 2).map((g) => (
                <div key={g.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body-sm text-ink-primary">{g.name}</span>
                    <span className="font-mono text-num-sm tabular-nums text-ink-muted">
                      {g.percentage_completed}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-chip bg-surface-inset">
                    <div
                      className="h-full rounded-chip bg-accent"
                      style={{ width: `${Math.min(100, g.percentage_completed)}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-num-sm tabular-nums text-ink-muted">
                    {formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── 6. Recent activity ───────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-stack-sm">
          <div>
            <SectionLabel>Recent activity</SectionLabel>
            <p className="mt-1 text-body-sm text-ink-muted">
              {transactions.length === 0
                ? "Nothing recorded yet"
                : `Last ${transactions.length} transactions`}
            </p>
          </div>
          <Link href="/dashboard/transactions">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}>
              All transactions
            </Button>
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="mt-stack-md">
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Add an expense by hand, or upload a receipt and let OCR fill it in."
              actionLabel="Add an expense"
              onAction={() => router.push("/dashboard/transactions")}
            />
          </div>
        ) : (
          <ul className="mt-stack-sm divide-y divide-line-subtle">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-stack py-stack">
                <div className="flex min-w-0 items-center gap-stack">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-chip border border-line-subtle bg-surface-raised text-ink-muted">
                    <Wallet size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm text-ink-primary">{t.merchant}</p>
                    <p className="truncate text-caption text-ink-muted">
                      {t.category} · {t.payment_method}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-num-md tabular-nums text-negative">
                  −{formatCurrency(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
