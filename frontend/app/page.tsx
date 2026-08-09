"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, PieChart, Zap, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function LandingPage() {
  return (
    <div className="app-canvas min-h-screen text-white flex flex-col selection:bg-[#3B82F6]/30 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B0D12]/70 backdrop-blur-2xl border-b border-white/[0.08] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6]">
              <Sparkles size={18} />
            </div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-lg">
              <span>Xpense</span>
              <span className="rounded-full bg-[#38BDF8]/15 px-2 py-0.5 text-xs font-mono font-semibold text-[#38BDF8] border border-[#38BDF8]/30">
                AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-28 pb-20 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-mono">
          <Sparkles size={14} />
          <span>Expense Intelligence &amp; AI Financial Advisor</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-medium tracking-[-0.055em] text-white leading-[.98]">
          A clearer view of your <span className="text-[#93C5FD]">financial life.</span>
        </h1>

        <p className="text-lg text-[#9BA4B5] max-w-2xl mx-auto leading-relaxed">
          Xpense turns everyday spending into a calm, useful picture of what is happening now—and what to do next.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/register">
            <Button variant="primary" size="lg" rightIcon={<ChevronRight size={18} />}>
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              View Demo Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Hero Bento Dashboard Mockup Preview */}
      <section className="px-6 py-12 max-w-6xl mx-auto w-full">
        <Card variant="raised" className="p-5 sm:p-8 border-white/[0.1] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar Preview */}
          <div className="flex items-center justify-between pb-6 border-b border-[#2A3140] mb-8">
            <div className="space-y-1">
              <span className="text-xs font-mono text-[#9BA4B5] uppercase tracking-wider">Net Position</span>
              <p className="font-mono text-4xl sm:text-5xl font-medium text-white tabular-nums">
                ₹4,82,950.00
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="positive">+12.4% vs last month</Badge>
              <Badge variant="ai">Live AI Audit</Badge>
            </div>
          </div>

          {/* Bento Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hoverLift className="p-6 space-y-3">
              <div className="flex justify-between text-xs font-mono text-[#9BA4B5]">
                <span>MONTHLY INCOME</span>
                <span className="text-[#45D6A5]">+8.4%</span>
              </div>
              <p className="font-mono text-2xl font-medium text-white tabular-nums">₹1,45,000.00</p>
              <p className="text-xs text-[#9BA4B5]">4 linked bank accounts</p>
            </Card>

            <Card hoverLift className="p-6 space-y-3">
              <div className="flex justify-between text-xs font-mono text-[#9BA4B5]">
                <span>TOTAL OUTFLOW</span>
                <span className="text-[#F07178]">−3.2%</span>
              </div>
              <p className="font-mono text-2xl font-medium text-white tabular-nums">₹68,400.00</p>
              <p className="text-[#F3B45B] text-xs font-mono">1 anomaly flagged</p>
            </Card>

            <Card hoverLift className="p-6 space-y-3 border-[#38BDF8]/40 bg-[#141824]">
              <div className="flex justify-between items-center text-xs font-mono text-[#38BDF8]">
                <span className="flex items-center gap-1"><Sparkles size={12} /> AI ADVISOR INSIGHT</span>
                <span className="text-[10px] bg-[#38BDF8]/20 px-1.5 py-0.5 rounded">AI</span>
              </div>
              <p className="text-xs text-white leading-relaxed">
                &quot;Dining out is 22% above your 3-month average. Reallocating ₹4,200 to your Emergency Goal keeps you on track.&quot;
              </p>
            </Card>
          </div>
        </Card>
      </section>

      {/* Feature Grid */}
      <section className="px-6 py-24 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-medium tracking-tight text-white">Built for financial accuracy and peace of mind</h2>
          <p className="text-[#9BA4B5] text-sm">Every numerical value, chart axis, and insight is built for precision.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hoverLift className="p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center border border-[#3B82F6]/30">
              <PieChart size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Bento Triage Dashboard</h3>
            <p className="text-xs text-[#9BA4B5] leading-relaxed">
              Glance your entire financial health in under 3 seconds. Net position, anomaly feed, cash flow forecast, and category progress.
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] flex items-center justify-center border border-[#38BDF8]/30">
              <Sparkles size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">AI Financial Advisor</h3>
            <p className="text-xs text-[#9BA4B5] leading-relaxed">
              Query your spending with strategy personas like Warren Buffett or Ramit Sethi for actionable money advice.
            </p>
          </Card>

          <Card hoverLift className="p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-[#45D6A5]/10 text-[#45D6A5] flex items-center justify-center border border-[#45D6A5]/30">
              <Zap size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Instant OCR Processing</h3>
            <p className="text-xs text-[#9BA4B5] leading-relaxed">
              Drag and drop physical receipts or screenshots. Our vision model parses line items, merchants, and dates with high confidence.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#2A3140] px-6 py-8 bg-[#141824]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#9BA4B5]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#45D6A5]" />
            <span>Bank-Grade Encryption &amp; Privacy First</span>
          </div>
          <p>© 2026 Xpense AI. All numerical data rendered in JetBrains Mono.</p>
        </div>
      </footer>
    </div>
  );
}
