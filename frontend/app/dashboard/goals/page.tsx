"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { Target, Plus, Trash2, X, PlusCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/colors";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  percentage_completed: number;
  category: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [category, setCategory] = useState("Security");
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Goal[]>("/api/v1/goals");
      setGoals(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load goals";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || submitting) return;

    setSubmitting(true);
    try {
      await apiFetch<Goal>("/api/v1/goals", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          target_amount: parseFloat(targetAmount),
          current_amount: currentAmount ? parseFloat(currentAmount) : 0,
          category,
        }),
      });

      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setShowAddForm(false);
      await fetchGoals();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create goal";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async (g: Goal) => {
    const contribution = prompt(`Add contribution to ${g.name} (₹):`, "5000");
    if (!contribution) return;

    const added = parseFloat(contribution);
    if (Number.isNaN(added) || added <= 0) return;

    try {
      await apiFetch(`/api/v1/goals/${g.id}`, {
        method: "PUT",
        body: JSON.stringify({
          current_amount: g.current_amount + added,
        }),
      });
      await fetchGoals();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update goal";
      alert(msg);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this savings goal?")) return;
    try {
      await apiFetch(`/api/v1/goals/${id}`, { method: "DELETE" });
      await fetchGoals();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete goal";
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Savings &amp; Wealth Goals</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Track progress on key financial milestones — distinct from spending budgets (motivates vs. constrains).
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAddForm(true)}>
          New Savings Goal
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-6 border-[#3B82F6]/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Create New Savings Target
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#9BA4B5] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleCreateGoal} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Goal Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emergency Fund"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Target Amount (₹)</label>
              <input
                type="number"
                required
                step="1000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="500000"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Current Saved (₹)</label>
              <input
                type="number"
                step="1000"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white"
              >
                <option value="Security">Security</option>
                <option value="Investment">Investment</option>
                <option value="Personal">Personal</option>
                <option value="Purchase">Purchase</option>
              </select>
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                Save Target Goal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {error && <Alert variant="error" message={error} />}

      {!loading && !error && goals.length === 0 && (
        <EmptyState
          icon={Target}
          title="No Goals Created"
          description="Establish your first savings goal to track capital growth over time."
          actionLabel="Add Goal"
          onAction={() => setShowAddForm(true)}
        />
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const pct = Math.min(100, goal.percentage_completed);
            return (
              <Card key={goal.id} hoverLift className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{goal.category}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#45D6A5] font-bold">{pct}% Completed</span>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 text-[#9BA4B5] hover:text-[#F07178]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white text-base">{goal.name}</h3>
                  <p className="font-mono text-2xl font-medium text-white tabular-nums mt-2">
                    {formatCurrency(goal.current_amount)}
                  </p>
                  <p className="text-xs font-mono text-[#9BA4B5]">Target: {formatCurrency(goal.target_amount)}</p>
                </div>

                <div className="h-2.5 w-full bg-[#1B2130] rounded-full overflow-hidden border border-[#2A3140]">
                  <div
                    className="h-full bg-[#45D6A5] rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  leftIcon={<PlusCircle size={14} />}
                  onClick={() => handleContribute(goal)}
                >
                  Add Contribution
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
