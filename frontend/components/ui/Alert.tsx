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
    error: { tone: "border-negative/30 bg-negative/10", icon: AlertCircle, iconColor: "text-negative" },
    success: { tone: "border-positive/30 bg-positive/10", icon: CheckCircle2, iconColor: "text-positive" },
    warning: { tone: "border-warning/30 bg-warning/10", icon: AlertCircle, iconColor: "text-warning" },
    info: { tone: "border-info/30 bg-info/10", icon: Info, iconColor: "text-info" },
  }[variant];

  const Icon = styles.icon;

  return (
    <div className={`flex items-start gap-3 rounded-card border p-stack-md ${styles.tone} ${className}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${styles.iconColor}`} />
      <div className="flex-1">
        {title && <h5 className="text-h3 text-ink-primary">{title}</h5>}
        <p className="text-body-sm text-ink-secondary">{message}</p>
        {action && <div className="mt-stack-sm">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="rounded-chip p-1 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
