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
      bg: "bg-[#F07178]/10 border-[#F07178]/30 text-[#F07178]",
      icon: AlertCircle,
      iconColor: "text-[#F07178]",
    },
    success: {
      bg: "bg-[#45D6A5]/10 border-[#45D6A5]/30 text-[#45D6A5]",
      icon: CheckCircle2,
      iconColor: "text-[#45D6A5]",
    },
    warning: {
      bg: "bg-[#F3B45B]/10 border-[#F3B45B]/30 text-[#F3B45B]",
      icon: AlertCircle,
      iconColor: "text-[#F3B45B]",
    },
    info: {
      bg: "bg-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]",
      icon: Info,
      iconColor: "text-[#3B82F6]",
    },
  }[variant];

  const Icon = styles.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-[16px] border p-4 text-sm ${styles.bg} ${className}`}
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
          className="p-1 rounded-lg hover:bg-white/10 text-[#9BA4B5] hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
