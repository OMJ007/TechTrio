"use client";

import { useState } from "react";
import TransactionList from "@/components/TransactionList";
import { Download, Filter, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import OCRUploadModal from "@/components/OCRUploadModal";

export default function TransactionsPage() {
  const [ocrOpen, setOcrOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Transactions Directory</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Full searchable, filterable, and sortable record of all your financial transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => alert("CSV Export initiated")}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload size={14} />}
            onClick={() => setOcrOpen(true)}
          >
            Upload Receipt
          </Button>
        </div>
      </div>

      {/* Main Transactions Component */}
      <TransactionList limit={100} />

      <OCRUploadModal open={ocrOpen} onClose={() => setOcrOpen(false)} onSuccess={() => {}} />
    </div>
  );
}
