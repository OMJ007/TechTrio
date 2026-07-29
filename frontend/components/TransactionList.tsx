"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Plus, Trash2, Edit2, Check, X, Tag, Receipt, CreditCard, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/colors";

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  merchant: string;
  category: string;
  payment_method: string;
  transaction_date: string;
  source: string;
  confidence_score: number | null;
  created_at: string;
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

interface TransactionListProps {
  onTransactionChanged?: () => void;
}

export default function TransactionList({ onTransactionChanged }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit category state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>("");

  // Add transaction form modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newMerchant, setNewMerchant] = useState("");
  const [newCategory, setNewCategory] = useState("Food");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Card");
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Transaction[]>("/api/v1/transactions?limit=50");
      setTransactions(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch transactions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newMerchant || submitting) return;

    setSubmitting(true);
    try {
      await apiFetch<Transaction>("/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(newAmount),
          merchant: newMerchant.trim(),
          category: newCategory,
          payment_method: newPaymentMethod,
        }),
      });

      setNewAmount("");
      setNewMerchant("");
      setShowAddForm(false);
      await fetchTransactions();
      onTransactionChanged?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add transaction";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCategory = async (id: string) => {
    if (!editCategory) return;
    try {
      await apiFetch(`/api/v1/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ category: editCategory }),
      });
      setEditingId(null);
      await fetchTransactions();
      onTransactionChanged?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update category";
      alert(msg);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await apiFetch(`/api/v1/transactions/${id}`, {
        method: "DELETE",
      });
      await fetchTransactions();
      onTransactionChanged?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete transaction";
      alert(msg);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-surface-900/80 backdrop-blur-sm p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Transactions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {transactions.length} recorded entries
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setShowAddForm(true)}
        >
          Add Expense
        </Button>
      </div>

      {/* Add Transaction Inline Card */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-700 bg-surface-850 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Add Manual Expense
            </h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleAddTransaction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400">
                Merchant / Store
              </label>
              <input
                type="text"
                value={newMerchant}
                onChange={(e) => setNewMerchant(e.target.value)}
                placeholder="e.g. Starbucks"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-surface-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-surface-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-surface-800 px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400">
                Payment Method
              </label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-surface-800 px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="NetBanking">NetBanking</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
              >
                Save Expense
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Loading state */}
      {loading && <TableSkeleton />}

      {/* Error state */}
      {error && !loading && (
        <Alert variant="error" message={error} />
      )}

      {/* Empty state */}
      {!loading && !error && transactions.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Record your first expense manually or upload a receipt to begin tracking."
          actionLabel="Add Expense"
          onAction={() => setShowAddForm(true)}
        />
      )}

      {/* Transactions Table */}
      {!loading && !error && transactions.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-white">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-surface-800 text-slate-400 border border-slate-700/60">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <span>{t.merchant}</span>
                      <span className="block text-[11px] font-normal text-slate-500">
                        {t.payment_method}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {editingId === t.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-surface-800 px-2 py-1 text-xs text-white focus:border-brand-500 focus:outline-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSaveCategory(t.id)}
                        className="rounded p-1 text-emerald-400 hover:bg-surface-800"
                        title="Save category"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-slate-400 hover:bg-surface-800"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <Badge variant="category" categoryName={t.category} icon={<Tag size={10} />}>
                      {t.category}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-slate-400 font-mono">
                  {new Date(t.transaction_date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                      t.source === "ocr"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {t.source === "ocr" && <Sparkles size={10} />}
                    {t.source}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold font-mono tabular-nums text-rose-400">
                  -{formatCurrency(t.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(t.id);
                        setEditCategory(t.category);
                      }}
                      title="Edit category"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-surface-800 hover:text-white"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(t.id)}
                      title="Delete transaction"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-surface-800 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
