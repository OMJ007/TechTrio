"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { User as UserIcon, Shield, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { StatCardSkeleton } from "@/components/ui/Skeleton";

interface UserProfile {
  id: string;
  email: string;
  monthly_income: number;
  risk_profile: string;
  created_at: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [income, setIncome] = useState("");
  const [risk, setRisk] = useState("moderate");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserProfile>("/api/v1/auth/me");
      setProfile(data);
      setIncome(String(data.monthly_income || 0));
      setRisk(data.risk_profile || "moderate");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load profile";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError(null);

    try {
      const updated = await apiFetch<UserProfile>("/api/v1/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          monthly_income: parseFloat(income),
          risk_profile: risk,
        }),
      });
      setProfile(updated);
      setSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update profile";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <StatCardSkeleton />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Account &amp; Workspace Settings</h1>
        <p className="text-xs font-mono text-[#9BA4B5]">
          Manage profile parameters, security, AI advisor personas, and notification thresholds.
        </p>
      </div>

      {success && <Alert variant="success" message="Profile settings updated successfully." />}
      {error && <Alert variant="error" message={error} />}

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#2A3140]">
          <div className="p-2.5 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
            <UserIcon size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-white text-base">User Profile</h2>
            <p className="text-xs font-mono text-[#9BA4B5]">{profile?.email} &middot; Active User</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-[#9BA4B5] mb-1">Monthly Income Baseline (₹)</label>
            <input
              type="number"
              step="100"
              required
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-4 py-2 text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[#9BA4B5] mb-1">Risk Profile Strategy</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-4 py-2 text-white text-xs"
            >
              <option value="conservative">Conservative (Capital Preservation)</option>
              <option value="moderate">Moderate (Balanced Growth &amp; Stability)</option>
              <option value="aggressive">Aggressive (Maximum Wealth Acceleration)</option>
            </select>
          </div>

          <Button type="submit" variant="primary" size="sm" isLoading={submitting} leftIcon={<Check size={14} />}>
            Save Profile Settings
          </Button>
        </form>
      </Card>
    </div>
  );
}
