"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, CheckCircle, AlertCircle, Sparkles, FileText } from "lucide-react";

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

  // ── Reset state when modal opens/closes ────────────────────────
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

  // ── Drag handlers ──────────────────────────────────────────────
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

  // ── Upload ─────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto touch-scrolling rounded-2xl border border-slate-800 bg-surface-900 p-4 sm:p-6 shadow-2xl space-y-4">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload Receipt</h2>
              <p className="text-xs text-slate-400">AI-powered OCR transaction parsing</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-surface-800 hover:text-white min-w-[40px] min-h-[40px] flex items-center justify-center"
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
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-150 ${
              dragging
                ? "border-brand-500 bg-brand-500/10"
                : "border-slate-700 bg-surface-850/60 hover:border-slate-600 hover:bg-surface-850"
            }`}
          >
            <div className="p-3 rounded-full bg-surface-800 text-slate-400 mb-3 border border-slate-700">
              <Upload size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-200 text-center">
              {file ? file.name : "Drop receipt image or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
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
          <div className="py-6 flex flex-col items-center justify-center gap-3 text-sm text-slate-300">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-brand-500" />
            <p className="text-xs text-slate-400">Scanning receipt &amp; extracting line items…</p>
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
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle size={16} />
                <span>Receipt Successfully Parsed</span>
              </div>
              <Badge variant="income" size="sm">
                {(result.confidence_score * 100).toFixed(0)}% Confidence
              </Badge>
            </div>

            <div className="rounded-xl border border-slate-800 bg-surface-850 p-4 text-xs space-y-2.5">
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

// ── Result row helper ──────────────────────────────────────────────────

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
    <div className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
      <span className="text-slate-400 font-medium">{label}</span>
      <span
        className={`font-semibold ${
          isAmount ? "text-rose-400 font-mono text-sm tabular-nums" : "text-white"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
