"use client";

import { BarChart3, Download, FileText } from "lucide-react";
import { getToken, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ReportsPage() {
  const handleExportCSV = async () => {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/v1/reports/export`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "xpense_transactions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Failed to download CSV export.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Financial Reports &amp; Statements</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Generate exportable PDF and CSV summaries for tax filing, business expenses, and personal audits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hoverLift className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Monthly Cash Flow Statement</h3>
              <p className="text-xs font-mono text-[#9BA4B5]">Full income, outflow, and net savings summary for current period.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExportCSV}>
            Download CSV Statement
          </Button>
        </Card>

        <Card hoverLift className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#45D6A5]/10 text-[#45D6A5] border border-[#45D6A5]/30">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Tax Category Ledger (CSV)</h3>
              <p className="text-xs font-mono text-[#9BA4B5]">Itemized transactions tagged for Section 80C &amp; deductible expenses.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExportCSV}>
            Download CSV Export
          </Button>
        </Card>
      </div>
    </div>
  );
}
