"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { Wallet, Building2, Plus, Trash2, X, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/colors";

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
  institution: string;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("Bank Account");
  const [balance, setBalance] = useState("");
  const [institution, setInstitution] = useState("Primary Bank");
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Account[]>("/api/v1/accounts");
      setAccounts(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load accounts";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || submitting) return;

    setSubmitting(true);
    try {
      await apiFetch<Account>("/api/v1/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          account_type: accountType,
          balance: balance ? parseFloat(balance) : 0,
          institution: institution.trim(),
        }),
      });

      setName("");
      setBalance("");
      setShowAddForm(false);
      await fetchAccounts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to link account";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this financial account?")) return;
    try {
      await apiFetch(`/api/v1/accounts/${id}`, { method: "DELETE" });
      await fetchAccounts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to disconnect account";
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Linked Financial Accounts</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            View connected bank accounts, credit cards, investment portfolios, and connection status.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAddForm(true)}>
          Connect Bank Account
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-6 border-[#3B82F6]/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Link New Account
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#9BA4B5] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleCreateAccount} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Account Label</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HDFC Salary Account"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Institution Name</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white"
              >
                <option value="Bank Account">Bank Account</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Investment">Investment</option>
                <option value="Wallet">Digital Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#9BA4B5] mb-1">Current Balance (₹)</label>
              <input
                type="number"
                step="100"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                Connect Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {error && <Alert variant="error" message={error} />}

      {!loading && !error && accounts.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No Accounts Linked"
          description="Connect your checking, credit, or investment accounts to view aggregate balances."
          actionLabel="Connect Account"
          onAction={() => setShowAddForm(true)}
        />
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc) => (
            <Card key={acc.id} hoverLift className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">{acc.name}</h3>
                    <span className="text-xs font-mono text-[#9BA4B5]">{acc.institution} &middot; {acc.account_type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="positive">Connected</Badge>
                  <button onClick={() => handleDeleteAccount(acc.id)} className="p-1 text-[#9BA4B5] hover:text-[#F07178]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2A3140] flex items-baseline justify-between">
                <span className="text-xs font-mono text-[#9BA4B5]">Current Balance</span>
                <span className={`font-mono text-2xl font-medium tabular-nums ${acc.balance >= 0 ? "text-white" : "text-[#F07178]"}`}>
                  {formatCurrency(acc.balance, { showSign: true })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
