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
    <main className="app-canvas flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-[28px] p-7 sm:p-10 shadow-2xl space-y-7">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] mb-1">
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white flex items-center justify-center gap-2">
            <span>Xpense</span>
            <span className="rounded-full bg-[#38BDF8]/15 px-2 py-0.5 text-xs font-mono font-semibold text-[#38BDF8] border border-[#38BDF8]/30">
              AI
            </span>
          </h1>
          <p className="text-xs text-[#9BA4B5]">
            A calmer way to stay on top of your money.
          </p>
        </div>

        {/* ── Error Alert ──────────────────────────────────────── */}
        {error && <Alert variant="error" message={error} onClose={clearError} />}

        {/* ── Form ────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 pl-10 text-sm text-white placeholder-[#7E8799] focus:border-[#3B82F6] focus:outline-none"
                placeholder="you@example.com"
              />
              <Mail size={16} className="absolute left-3.5 top-3 text-[#9BA4B5]" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#9BA4B5] mb-1.5">
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
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 pl-10 text-sm text-white placeholder-[#7E8799] focus:border-[#3B82F6] focus:outline-none"
                placeholder="••••••••"
              />
              <Lock size={16} className="absolute left-3.5 top-3 text-[#9BA4B5]" />
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
        <p className="text-center text-xs text-[#9BA4B5] pt-4 border-t border-[#2A3140]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[#3B82F6] hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
