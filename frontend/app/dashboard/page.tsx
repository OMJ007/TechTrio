"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, LogOut, Sparkles, RefreshCw, ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { CategoryPieChart, TrendAreaChart } from "@/components/SpendingChart";
import type { CategoryDatum, TrendDatum } from "@/components/SpendingChart";
import OCRUploadModal from "@/components/OCRUploadModal";
import AdvisorChat from "@/components/AdvisorChat";
import TransactionList from "@/components/TransactionList";
import SummaryCards, { type SummaryData } from "@/components/dashboard/SummaryCards";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { StatCardSkeleton } from "@/components/ui/Skeleton";

// ── Types for API responses ────────────────────────────────────────────

interface CategoriesResponse {
  categories: CategoryDatum[];
}

interface TrendsResponse {
  timeframe: string;
  data: TrendDatum[];
}

// ── Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { token, logout } = useAuthStore();

  // Data state
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [categories, setCategories] = useState<CategoryDatum[]>([]);
  const [trends, setTrends] = useState<TrendDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OCR modal & filter states
  const [ocrOpen, setOcrOpen] = useState(false);
  const [timeframe, setTimeframe] = useState("30d");
  const [categoryPeriod, setCategoryPeriod] = useState("month");

  // ── Guard: redirect if not authenticated ──────────────────────
  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [token, router]);

  // ── Data fetching ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [s, c, t] = await Promise.all([
        apiFetch<SummaryData>(`/api/v1/analytics/summary?period=${categoryPeriod}`),
        apiFetch<CategoriesResponse>(`/api/v1/analytics/categories?period=${categoryPeriod}`),
        apiFetch<TrendsResponse>(`/api/v1/analytics/trends?timeframe=${timeframe}`),
      ]);
      setSummary(s);
      setCategories(c.categories);
      setTrends(t.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load dashboard metrics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, timeframe, categoryPeriod]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 bg-radial-gradient">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Xpense</span>
                <span className="rounded bg-brand-600/20 px-1.5 py-0.5 text-xs font-semibold text-brand-400 border border-brand-500/30">
                  AI
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Expense Intelligence &amp; Financial Advisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload size={16} />}
              onClick={() => setOcrOpen(true)}
            >
              Upload Receipt
            </Button>

            <div className="h-4 w-px bg-slate-800" />

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-surface-800 hover:text-white"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* ── Loading Skeleton ─────────────────────────────── */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────────────── */}
        {error && !loading && (
          <Alert
            variant="error"
            title="Dashboard Loading Error"
            message={error}
            action={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={fetchAll}
              >
                Retry
              </Button>
            }
          />
        )}

        {/* ── Content (Loaded) ─────────────────────────────── */}
        {!loading && !error && (
          <>
            {/* 3-Second Summary Glanceability */}
            {summary && <SummaryCards summary={summary} />}

            {/* 2-Column Grid: Charts & Activity (2/3) + Advisor (1/3) */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column — 2/3 width */}
              <div className="space-y-6 lg:col-span-2">
                {/* Category Pie Chart */}
                <CategoryPieChart
                  data={categories}
                  periodSelect={
                    <select
                      value={categoryPeriod}
                      onChange={(e) => setCategoryPeriod(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-surface-800 px-2.5 py-1 text-xs font-medium text-slate-300 focus:border-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="month">This Month</option>
                      <option value="all">All Time</option>
                    </select>
                  }
                />

                {/* Trend Area Chart */}
                <TrendAreaChart
                  data={trends}
                  timeframeSelect={
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-surface-800 px-2.5 py-1 text-xs font-medium text-slate-300 focus:border-brand-500 focus:outline-none cursor-pointer"
                    >
                      <option value="7d">7 days</option>
                      <option value="30d">30 days</option>
                      <option value="90d">90 days</option>
                    </select>
                  }
                />

                {/* Transactions Table */}
                <TransactionList onTransactionChanged={fetchAll} />
              </div>

              {/* Right Column — 1/3 width AI Advisor */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 rounded-xl border border-slate-800 bg-surface-900/90 backdrop-blur-md p-4 shadow-sm flex flex-col h-[600px]">
                  <div className="mb-3 flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        AI Advisor
                      </h3>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck size={12} /> Live Insights
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <AdvisorChat />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── OCR Modal ─────────────────────────────────────── */}
      <OCRUploadModal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onSuccess={fetchAll}
      />
    </div>
  );
}
