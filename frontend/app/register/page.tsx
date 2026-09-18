"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Lock, Mail, IndianRupee, ArrowRight, User } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const RISK_PROFILES = [
  { value: "conservative", label: "Conservative", desc: "Capital preservation focus" },
  { value: "moderate", label: "Moderate", desc: "Balanced growth & stability" },
  { value: "aggressive", label: "Aggressive", desc: "Maximum wealth acceleration" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [income, setIncome] = useState("");
  const [risk, setRisk] = useState<string>("moderate");

  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    clearError();

    if (password !== confirm) {
      setFieldError("Passwords do not match");
      return;
    }

    const monthlyIncome = parseFloat(income);
    if (Number.isNaN(monthlyIncome) || monthlyIncome < 0) {
      setFieldError("Please enter a valid monthly income");
      return;
    }

    try {
      await register({
        email,
        password,
        full_name: fullName.trim() || undefined,
        monthly_income: monthlyIncome,
        risk_profile: risk,
      });
      router.push("/onboarding");
    } catch {
      // error is set in store
    }
  };

  const displayError = fieldError || error;

  return (
    <main className="app-canvas flex min-h-screen items-center justify-center p-4 py-8">
      <div className="glass w-full max-w-md rounded-[28px] p-7 sm:p-9 shadow-2xl space-y-5">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] mb-1">
            <Sparkles size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white flex items-center justify-center gap-2">
            <span>Xpense</span>
            <span className="rounded-full bg-[#38BDF8]/15 px-2 py-0.5 text-xs font-mono font-semibold text-[#38BDF8] border border-[#38BDF8]/30">
              AI
            </span>
          </h1>
          <p className="text-xs text-[#9BA4B5]">
            Set up your private financial workspace.
          </p>
        </div>

        {/* ── Error Alert ──────────────────────────────────────── */}
        {displayError && <Alert variant="error" message={displayError} onClose={() => { setFieldError(null); clearError(); }} />}

        {/* ── Form ────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label htmlFor="full-name" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                id="full-name"
                type="text"
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3.5 py-2 pl-9 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6]"
                placeholder="Alice Sharma"
              />
              <User size={14} className="absolute left-3 top-3 text-[#9BA4B5]" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3.5 py-2 pl-9 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6]"
                placeholder="you@example.com"
              />
              <Mail size={14} className="absolute left-3 top-3 text-[#9BA4B5]" />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="password" className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3.5 py-2 pl-9 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6]"
                  placeholder="8+ chars"
                />
                <Lock size={14} className="absolute left-3 top-3 text-[#9BA4B5]" />
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1">
                Confirm
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3.5 py-2 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6]"
                placeholder="Confirm"
              />
            </div>
          </div>

          {/* Income */}
          <div>
            <label htmlFor="income" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1">
              Monthly Income (₹)
            </label>
            <div className="relative">
              <input
                id="income"
                type="number"
                required
                min={0}
                step={100}
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-3.5 py-2 pl-9 text-xs text-white placeholder-[#9BA4B5] focus:border-[#3B82F6] font-mono"
                placeholder="50000"
              />
              <IndianRupee size={14} className="absolute left-3 top-3 text-[#9BA4B5]" />
            </div>
          </div>

          {/* Risk Profile Selection Cards */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1.5">
              Investment Risk Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RISK_PROFILES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setRisk(p.value)}
                  className={`rounded-lg border p-2.5 text-left transition-all ${
                    risk === p.value
                      ? "border-[#3B82F6] bg-[#3B82F6]/10 text-white"
                      : "border-[#2A3140] bg-[#1B2130] text-[#9BA4B5] hover:border-[#3B82F6]/50"
                  }`}
                >
                  <p className="text-xs font-semibold">{p.label}</p>
                  <p className="text-[10px] font-mono text-[#9BA4B5] leading-tight mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            className="w-full mt-2"
            rightIcon={<ArrowRight size={16} />}
          >
            Create Account &amp; Setup Profile
          </Button>
        </form>

        {/* ── Footer ──────────────────────────────────────────── */}
        <p className="text-center text-xs text-[#9BA4B5] pt-3 border-t border-[#2A3140]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#3B82F6] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
