"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Lock, Mail, IndianRupee, ShieldCheck, ArrowRight } from "lucide-react";

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
        monthly_income: monthlyIncome,
        risk_profile: risk,
      });
      router.push("/dashboard");
    } catch {
      // error is set in store
    }
  };

  const displayError = fieldError || error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-950 p-3 sm:p-4 py-6 sm:py-8 bg-radial-gradient">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-surface-900/90 backdrop-blur-xl p-5 sm:p-8 shadow-2xl space-y-5">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 mb-1">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Xpense</span>
            <span className="rounded bg-brand-600/20 px-1.5 py-0.5 text-xs font-semibold text-brand-400 border border-brand-500/30">
              AI
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Create your account &amp; setup financial profile
          </p>
        </div>

        {/* ── Error Alert ──────────────────────────────────────── */}
        {displayError && <Alert variant="error" message={displayError} onClose={() => { setFieldError(null); clearError(); }} />}

        {/* ── Form ────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-surface-800 px-3.5 py-2 pl-9 text-base sm:text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="you@example.com"
              />
              <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
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
                  className="w-full rounded-xl border border-slate-700 bg-surface-800 px-3.5 py-2 pl-9 text-base sm:text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  placeholder="8+ chars"
                />
                <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Confirm
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-surface-800 px-3.5 py-2 text-base sm:text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                placeholder="Confirm"
              />
            </div>
          </div>

          {/* Income */}
          <div>
            <label htmlFor="income" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
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
                className="w-full rounded-xl border border-slate-700 bg-surface-800 px-3.5 py-2 pl-9 text-base sm:text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono"
                placeholder="50000"
              />
              <IndianRupee size={14} className="absolute left-3 top-3 text-slate-500" />
            </div>
          </div>

          {/* Risk Profile Selection Cards */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Investment Risk Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RISK_PROFILES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setRisk(p.value)}
                  className={`rounded-xl border p-2.5 text-left transition-all min-h-[44px] ${
                    risk === p.value
                      ? "border-brand-500 bg-brand-500/10 text-white"
                      : "border-slate-800 bg-surface-850 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-semibold">{p.label}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.desc}</p>
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
        <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
