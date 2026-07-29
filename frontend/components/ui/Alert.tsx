"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export interface AlertProps {
  variant?: "error" | "success" | "info" | "warning";
  title?: string;
  message: string;
  onClose?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function Alert({
  variant = "error",
  title,
  message,
  onClose,
  action,
  className = "",
}: AlertProps) {
  const styles = {
    error: {
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-300",
      icon: AlertCircle,
      iconColor: "text-rose-400",
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      icon: AlertCircle,
      iconColor: "text-amber-400",
    },
    info: {
      bg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
      icon: Info,
      iconColor: "text-cyan-400",
    },
  }[variant];

  const Icon = styles.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles.bg} ${className}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${styles.iconColor}`} />
      <div className="flex-1">
        {title && <h5 className="font-semibold text-white mb-0.5">{title}</h5>}
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
