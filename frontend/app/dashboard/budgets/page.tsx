"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { Plus, Trash2, Target, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/colors";

interface Budget {
  id: string;
  category: string;
  target_amount: number;
  spent_amount: number;
  percentage_used: number;
  period: string;
}

const CATEGORIES = [
  "Food",
  "Groceries",
  "Transport",
  "Bills",
  "Shopping",
  "Healthcare",
  "Entertainment",
  "Education",
  "Investments",
  "Rent",
  "Uncategorized",
];

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState("Food");
  const [targetAmount, setTargetAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Budget[]>("/api/v1/budgets");
      setBudgets(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load budgets";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleCreateBudget = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetAmount || submitting) return;

    setSubmitting(true);
    try {
      await apiFetch<Budget>("/api/v1/budgets", {
        method: "POST",
        body: JSON.stringify({
          category,
          target_amount: parseFloat(targetAmount),
          period: "month",
        }),
      });

      setTargetAmount("");
      setShowAddForm(false);
      await fetchBudgets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to set budget";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Are you sure you want to remove this budget target?")) return;
    try {
      await apiFetch(`/api/v1/budgets/${id}`, { method: "DELETE" });
      await fetchBudgets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete budget";
      alert(msg);
    }
  };

  const totalTarget = budgets.reduce((acc, b) => acc + b.target_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const overBudgetCount = budgets.filter((b) => b.percentage_used > 100).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Monthly Budgets</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Track category spending limits, set safeguards, and monitor month-over-month usage.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAddForm(true)}>
          Set Category Budget
        </Button>
      </div>

      {/* Create Budget Modal */}
      {showAddForm && (
        <Card className="p-6 border-[#3B82F6]/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Set Category Spending Limit
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#9BA4B5] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleCreateBudget} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Monthly Limit (₹)</label>
              <input
                type="number"
                step="100"
                min="100"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                Save Budget Limit
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2">
          <span className="text-xs font-mono text-[#9BA4B5]">TOTAL MONTHLY ALLOCATION</span>
          <p className="font-mono text-3xl font-medium text-white tabular-nums">{formatCurrency(totalTarget)}</p>
          <p className="text-xs font-mono text-[#45D6A5]">{formatCurrency(totalSpent)} spent</p>
        </Card>

        <Card className="p-6 space-y-2">
          <span className="text-xs font-mono text-[#9BA4B5]">REMAINING BUFFER</span>
          <p className="font-mono text-3xl font-medium text-[#45D6A5] tabular-nums">
            {formatCurrency(Math.max(0, totalTarget - totalSpent))}
          </p>
          <p className="text-xs font-mono text-[#9BA4B5]">Across all active categories</p>
        </Card>

        <Card className="p-6 space-y-2">
          <span className="text-xs font-mono text-[#9BA4B5]">EXCEEDED BUDGETS</span>
          <p className={`font-mono text-3xl font-medium tabular-nums ${overBudgetCount > 0 ? "text-[#F07178]" : "text-[#45D6A5]"}`}>
            {overBudgetCount} Categories
          </p>
          <p className="text-xs font-mono text-[#9BA4B5]">{overBudgetCount > 0 ? "Action required" : "All limits respected"}</p>
        </Card>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {error && <Alert variant="error" message={error} />}

      {!loading && !error && budgets.length === 0 && (
        <EmptyState
          icon={Target}
          title="No Budgets Defined"
          description="Create category spending targets to automatically track month-over-month usage."
          actionLabel="Create Budget"
          onAction={() => setShowAddForm(true)}
        />
      )}

      {/* Category Progress Cards */}
      {!loading && !error && budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((item) => {
            const isOver = item.percentage_used > 100;

            return (
              <Card key={item.id} hoverLift className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-base">{item.category}</h3>
                    <p className="text-xs font-mono text-[#9BA4B5]">
                      Target: {formatCurrency(item.target_amount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOver ? (
                      <Badge variant="negative">Exceeded</Badge>
                    ) : item.percentage_used > 80 ? (
                      <Badge variant="warning">Near Limit</Badge>
                    ) : (
                      <Badge variant="positive">Under Budget</Badge>
                    )}

                    <button
                      onClick={() => handleDeleteBudget(item.id)}
                      className="p-1 text-[#9BA4B5] hover:text-[#F07178] rounded"
                      title="Delete Budget"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#9BA4B5]">Spent: {formatCurrency(item.spent_amount)}</span>
                    <span className={`font-bold ${isOver ? "text-[#F07178]" : "text-white"}`}>
                      {item.percentage_used}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-[#1B2130] rounded-full overflow-hidden border border-[#2A3140]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isOver ? "bg-[#F07178]" : "bg-[#45D6A5]"}`}
                      style={{ width: `${Math.min(100, item.percentage_used)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
