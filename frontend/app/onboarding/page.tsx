"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Building2, Upload, CheckCircle2, ArrowRight, Wallet, Target, Bot } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form states
  const [bankConnected, setBankConnected] = useState(false);
  const [foodBudget, setFoodBudget] = useState("12000");
  const [billsBudget, setBillsBudget] = useState("25000");
  const [persona, setPersona] = useState("warren_buffett");

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0D12] text-white flex flex-col items-center justify-center p-6 selection:bg-[#3B82F6]/30">
      <div className="w-full max-w-2xl space-y-8">
        {/* Top Branding & Progress Bar */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] text-xs font-mono">
            <Sparkles size={14} />
            <span>Account Setup Wizard</span>
          </div>

          <h1 className="text-3xl font-medium tracking-tight text-white">Welcome to Xpense AI</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">Let&apos;s configure your expense intelligence system in 3 quick steps.</p>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <div className={`h-1.5 w-16 rounded-full ${step >= 1 ? "bg-[#3B82F6]" : "bg-[#2A3140]"}`} />
            <div className={`h-1.5 w-16 rounded-full ${step >= 2 ? "bg-[#3B82F6]" : "bg-[#2A3140]"}`} />
            <div className={`h-1.5 w-16 rounded-full ${step >= 3 ? "bg-[#3B82F6]" : "bg-[#2A3140]"}`} />
          </div>
        </div>

        {/* Step 1: Connect Account / Data Source */}
        {step === 1 && (
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
                <Wallet size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Step 1: Link Accounts &amp; Data</h2>
                <p className="text-xs text-[#9BA4B5]">Connect your primary bank or upload transaction receipts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setBankConnected(!bankConnected)}
                className={`p-5 rounded-[16px] border text-left space-y-3 transition-all ${
                  bankConnected
                    ? "border-[#45D6A5] bg-[#45D6A5]/10 text-white"
                    : "border-[#2A3140] bg-[#1B2130] text-[#9BA4B5] hover:border-[#3B82F6]/50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <Building2 size={20} className={bankConnected ? "text-[#45D6A5]" : "text-[#3B82F6]"} />
                  {bankConnected && <CheckCircle2 size={18} className="text-[#45D6A5]" />}
                </div>
                <h3 className="font-semibold text-white text-sm">HDFC Bank (Primary)</h3>
                <p className="text-xs font-mono text-[#9BA4B5]">Sync checking &amp; credit card txns</p>
              </button>

              <div className="p-5 rounded-[16px] border border-[#2A3140] bg-[#1B2130] space-y-3">
                <Upload size={20} className="text-[#38BDF8]" />
                <h3 className="font-semibold text-white text-sm">Upload Receipt PDF/Img</h3>
                <p className="text-xs font-mono text-[#9BA4B5]">Parse via Vision OCR pipeline</p>
              </div>
            </div>

            <Button variant="primary" size="lg" className="w-full" onClick={handleNext} rightIcon={<ArrowRight size={16} />}>
              Continue to Budgeting
            </Button>
          </Card>
        )}

        {/* Step 2: Set First Monthly Budget */}
        {step === 2 && (
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#45D6A5]/10 text-[#45D6A5] border border-[#45D6A5]/30">
                <Target size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Step 2: Set Category Limits</h2>
                <p className="text-xs text-[#9BA4B5]">Configure targets so our anomaly engine can guard your outflow.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#9BA4B5] mb-1">
                  Food &amp; Dining Target (Monthly ₹)
                </label>
                <input
                  type="number"
                  value={foodBudget}
                  onChange={(e) => setFoodBudget(e.target.value)}
                  className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9BA4B5] mb-1">
                  Recurring Bills &amp; Subscriptions Target (Monthly ₹)
                </label>
                <input
                  type="number"
                  value={billsBudget}
                  onChange={(e) => setBillsBudget(e.target.value)}
                  className="w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-4 py-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>

            <Button variant="primary" size="lg" className="w-full" onClick={handleNext} rightIcon={<ArrowRight size={16} />}>
              Configure AI Advisor
            </Button>
          </Card>
        )}

        {/* Step 3: Choose AI Advisor Persona */}
        {step === 3 && (
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Step 3: Select AI Strategy Persona</h2>
                <p className="text-xs text-[#9BA4B5]">Choose how your AI advisor analyzes your financial decisions.</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { id: "warren_buffett", title: "Warren Buffett", desc: "Long-term value, cash flow compounding, and capital allocation restraint." },
                { id: "ramit_sethi", title: "Ramit Sethi", desc: "Automated wealth building, conscious spending on what you love." },
                { id: "indian_tax", title: "Indian Tax & Financial Advisor", desc: "Section 80C, 80D, HRA optimization, and tax-efficient investing." },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPersona(item.id)}
                  className={`w-full p-4 rounded-[16px] border text-left flex items-start gap-4 transition-all ${
                    persona === item.id
                      ? "border-[#38BDF8] bg-[#38BDF8]/10 text-white"
                      : "border-[#2A3140] bg-[#1B2130] text-[#9BA4B5] hover:border-[#3B82F6]/50"
                  }`}
                >
                  <div className="p-2 rounded-lg bg-[#141824] text-[#38BDF8] border border-[#2A3140]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                    <p className="text-xs text-[#9BA4B5] mt-0.5">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <Button variant="primary" size="lg" className="w-full" onClick={handleNext} rightIcon={<ArrowRight size={16} />}>
              Complete Setup &amp; Launch Dashboard
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}
