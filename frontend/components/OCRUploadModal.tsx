"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, CheckCircle, Sparkles } from "lucide-react";

import { apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/colors";

// ── Types ──────────────────────────────────────────────────────────────

interface OcrResult {
  transaction_id: string;
  raw_text: string;
  confidence_score: number;
  extracted: {
    amount: number | null;
    merchant: string | null;
    date: string | null;
    upi_id: string | null;
    transaction_id: string | null;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Component ──────────────────────────────────────────────────────────

export default function OCRUploadModal({ open, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const data: OcrResult = await apiUpload("/api/v1/ocr/upload", file);
      setResult(data);
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[16px] border border-[#2A3140] bg-[#141824] p-6 shadow-2xl space-y-4">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2A3140]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload Receipt</h2>
              <p className="text-xs text-[#9BA4B5]">AI-powered OCR transaction parsing</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-[#9BA4B5] hover:bg-[#1B2130] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Drop zone ───────────────────────────────────────── */}
        {!result && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed p-8 transition-all duration-150 ${
              dragging
                ? "border-[#3B82F6] bg-[#3B82F6]/10"
                : "border-[#2A3140] bg-[#1B2130]/50 hover:border-[#3B82F6]/50 hover:bg-[#1B2130]"
            }`}
          >
            <div className="p-3 rounded-full bg-[#141824] text-[#9BA4B5] mb-3 border border-[#2A3140]">
              <Upload size={24} />
            </div>
            <p className="text-sm font-semibold text-white text-center">
              {file ? file.name : "Drop receipt image or click to browse"}
            </p>
            <p className="mt-1 text-xs text-[#9BA4B5]">
              Supports JPEG, PNG, WebP &middot; Up to 10 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* ── Upload action ───────────────────────────────────── */}
        {file && !result && !uploading && (
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleUpload}
            leftIcon={<Sparkles size={16} />}
          >
            Upload &amp; Extract Data
          </Button>
        )}

        {/* ── Progress ────────────────────────────────────────── */}
        {uploading && (
          <div className="py-6 flex flex-col items-center justify-center gap-3 text-sm text-[#9BA4B5]">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2A3140] border-t-[#3B82F6]" />
            <p className="text-xs text-[#9BA4B5]">Scanning receipt &amp; extracting line items…</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <Alert variant="error" message={error} />
        )}

        {/* ── Result Extraction ───────────────────────────────── */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#45D6A5]">
                <CheckCircle size={16} />
                <span>Receipt Successfully Parsed</span>
              </div>
              <Badge variant="ai" size="sm">
                {(result.confidence_score * 100).toFixed(0)}% Confidence
              </Badge>
            </div>

            <div className="rounded-[16px] border border-[#2A3140] bg-[#1B2130] p-4 text-xs space-y-2.5">
              <ResultRow label="Merchant" value={result.extracted.merchant} />
              <ResultRow
                label="Amount"
                value={
                  result.extracted.amount != null
                    ? formatCurrency(result.extracted.amount)
                    : null
                }
                isAmount
              />
              <ResultRow label="Date" value={result.extracted.date} />
              <ResultRow label="UPI ID" value={result.extracted.upi_id} />
              <ResultRow
                label="Txn Reference"
                value={result.extracted.transaction_id}
              />
            </div>

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  isAmount = false,
}: {
  label: string;
  value: string | null;
  isAmount?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#2A3140]/60 last:border-0">
      <span className="text-[#9BA4B5] font-mono text-xs">{label}</span>
      <span
        className={`font-semibold ${
          isAmount ? "text-[#F07178] font-mono text-sm tabular-nums" : "text-white"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
