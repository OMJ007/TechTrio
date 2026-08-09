"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Upload, Sparkles, Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import OCRUploadModal from "@/components/OCRUploadModal";
import { formatCurrency } from "@/lib/colors";

interface OCRTransaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  payment_method: string;
  transaction_date: string;
  confidence_score: number | null;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<OCRTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<OCRTransaction[]>("/api/v1/transactions?source=ocr");
      setReceipts(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load receipts";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">OCR Document Vault</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Upload history, parsed line items, confidence scores, and raw receipt extractions.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Upload size={14} />} onClick={() => setOcrOpen(true)}>
          Upload Receipt Image
        </Button>
      </div>

      {loading && <TableSkeleton />}

      {error && <Alert variant="error" message={error} />}

      {!loading && !error && receipts.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No Scanned Receipts"
          description="Upload a receipt image or invoice to extract transaction data automatically."
          actionLabel="Upload Receipt"
          onAction={() => setOcrOpen(true)}
        />
      )}

      {!loading && !error && receipts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {receipts.map((r) => (
            <Card key={r.id} hoverLift className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#9BA4B5]">{r.category}</span>
                <Badge variant="ai">
                  {r.confidence_score ? `${(r.confidence_score * 100).toFixed(0)}% AI Conf.` : "OCR Parse"}
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold text-white text-base">{r.merchant}</h3>
                <p className="font-mono text-xl font-medium text-white tabular-nums mt-1">
                  {formatCurrency(r.amount)}
                </p>
              </div>

              <div className="pt-2 border-t border-[#2A3140] flex items-center justify-between text-xs font-mono text-[#9BA4B5]">
                <span>Date: {new Date(r.transaction_date).toLocaleDateString()}</span>
                <span className="text-[#45D6A5] font-semibold">Parsed</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OCRUploadModal open={ocrOpen} onClose={() => setOcrOpen(false)} onSuccess={fetchReceipts} />
    </div>
  );
}
