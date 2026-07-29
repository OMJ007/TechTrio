"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Lock, Mail, ArrowRight } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      // error is set in store
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-950 p-4 bg-radial-gradient">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-surface-900/90 backdrop-blur-xl p-5 sm:p-8 shadow-2xl space-y-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 mb-1">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Xpense</span>
            <span className="rounded bg-brand-600/20 px-1.5 py-0.5 text-xs font-semibold text-brand-400 border border-brand-500/30">
              AI
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access your financial intelligence workspace
          </p>
        </div>

        {/* ── Error Alert ──────────────────────────────────────── */}
        {error && <Alert variant="error" message={error} onClose={clearError} />}

        {/* ── Form ────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-surface-800 px-4 py-2.5 pl-10 text-base sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="you@example.com"
              />
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                className="w-full rounded-xl border border-slate-700 bg-surface-800 px-4 py-2.5 pl-10 text-base sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="••••••••"
              />
              <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            className="w-full mt-2"
            rightIcon={<ArrowRight size={16} />}
          >
            Sign In
          </Button>
        </form>

        {/* ── Footer ──────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
