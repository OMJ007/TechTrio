"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Plus, Trash2, Edit2, Check, X, Tag, Receipt, CreditCard, Sparkles, Search, Filter } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DataTable, type Column } from "@/components/ui/DataTable";
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
  "All",
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
  limit?: number;
}

export default function TransactionList({ onTransactionChanged, limit = 50 }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date_desc");

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
      const queryParams = new URLSearchParams();
      queryParams.set("limit", String(limit));
      if (search.trim()) queryParams.set("search", search.trim());
      if (selectedCategory && selectedCategory !== "All") queryParams.set("category", selectedCategory);
      if (sortBy) queryParams.set("sort_by", sortBy);

      const data = await apiFetch<Transaction[]>(`/api/v1/transactions?${queryParams.toString()}`);
      setTransactions(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch transactions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [limit, search, selectedCategory, sortBy]);

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

  const columns: Column<Transaction>[] = [
    {
      header: "Merchant",
      accessor: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#1B2130] text-[#9BA4B5] border border-[#2A3140]">
            <CreditCard size={14} />
          </div>
          <div>
            <span className="font-semibold text-white">{t.merchant}</span>
            <span className="block text-[11px] font-mono text-[#9BA4B5]">
              {t.payment_method}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: (t) => (
        editingId === t.id ? (
          <div className="flex items-center gap-1.5">
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="rounded-lg border border-[#2A3140] bg-[#141824] px-2 py-1 text-xs text-white focus:border-[#3B82F6]"
            >
              {CATEGORIES.filter(c => c !== "All").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleSaveCategory(t.id)}
              className="rounded p-1 text-[#45D6A5] hover:bg-[#1B2130]"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="rounded p-1 text-[#9BA4B5] hover:bg-[#1B2130]"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <Badge variant="category" category={t.category}>
            {t.category}
          </Badge>
        )
      ),
    },
    {
      header: "Date",
      accessor: (t) => (
        <span className="text-xs text-[#9BA4B5] font-mono">
          {new Date(t.transaction_date).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      header: "Source",
      accessor: (t) => (
        t.source === "ocr" ? (
          <Badge variant="ai">
            OCR Parse
          </Badge>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BA4B5] bg-[#2A3140] px-2 py-0.5 rounded-full">
            {t.source}
          </span>
        )
      ),
    },
    {
      header: "Amount",
      align: "right",
      isNumeric: true,
      accessor: (t) => (
        <span className="font-mono font-medium text-sm tabular-nums text-[#F07178]">
          −{formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "center",
      accessor: (t) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => {
              setEditingId(t.id);
              setEditCategory(t.category);
            }}
            className="p-1 text-[#9BA4B5] hover:text-white rounded transition-colors"
            title="Edit Category"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDeleteTransaction(t.id)}
            className="p-1 text-[#9BA4B5] hover:text-[#F07178] rounded transition-colors"
            title="Delete Transaction"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-[24px] border border-white/[0.09] bg-[#141824]/75 p-4 shadow-[0_18px_60px_-40px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-6 space-y-5">
      {/* Header Controls: Search & Category Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9BA4B5]" />
            <input
              type="text"
              placeholder="Search merchant or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.045] border border-white/[0.1] rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-[#7E8799] focus:border-[#3B82F6] focus:outline-none font-mono"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/[0.045] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-[#3B82F6] focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/[0.045] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-[#3B82F6] focus:outline-none"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setShowAddForm(true)}
        >
          Add Expense
        </Button>
      </div>

      {/* Add Transaction Form Modal / Inline */}
      {showAddForm && (
        <div className="rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/[0.06] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Add Manual Expense
            </h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-[#9BA4B5] hover:text-white p-1 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleAddTransaction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] font-mono text-[#9BA4B5]">
                Merchant / Store
              </label>
              <input
                type="text"
                value={newMerchant}
                onChange={(e) => setNewMerchant(e.target.value)}
                placeholder="e.g. Starbucks"
                required
                className="mt-1 w-full rounded-lg border border-[#2A3140] bg-[#141824] px-3 py-2 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#9BA4B5]">
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
                className="mt-1 w-full rounded-lg border border-[#2A3140] bg-[#141824] px-3 py-2 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#9BA4B5]">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#2A3140] bg-[#141824] px-3 py-2 text-xs text-white focus:border-[#3B82F6]"
              >
                {CATEGORIES.filter(c => c !== "All").map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#9BA4B5]">
                Payment Method
              </label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#2A3140] bg-[#141824] px-3 py-2 text-xs text-white focus:border-[#3B82F6]"
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
          title="No transactions found"
          description="Try adjusting your search filters or record a new expense."
          actionLabel="Add Expense"
          onAction={() => setShowAddForm(true)}
        />
      )}

      {/* Transactions Data Table */}
      {!loading && !error && transactions.length > 0 && (
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t) => t.id}
        />
      )}
    </div>
  );
}
