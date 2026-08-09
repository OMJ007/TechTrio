"use client";

import AdvisorChat from "@/components/AdvisorChat";
import { Card } from "@/components/ui/Card";
import { ShieldCheck } from "lucide-react";

export default function AdvisorPage() {
  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-3 pb-2 overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 px-1">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-[-0.04em] flex items-center gap-2">
            <span>Ask about your money.</span>
            <span className="rounded-full bg-[#38BDF8]/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#38BDF8] border border-[#38BDF8]/30">
              Full Screen
            </span>
          </h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Personalised ideas based on your cash flow, spending, and goals.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#45D6A5] bg-[#45D6A5]/10 px-2.5 py-1 rounded-full border border-[#45D6A5]/30 shrink-0">
          <ShieldCheck size={12} />
          <span>Real-time AI Model Active</span>
        </div>
      </div>

      {/* Full Screen Dynamic Chat Card */}
      <Card className="flex-1 flex flex-col min-h-0 border-white/[0.1] p-3 sm:p-5 overflow-hidden">
        <AdvisorChat />
      </Card>
    </div>
  );
}
