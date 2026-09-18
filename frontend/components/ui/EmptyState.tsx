"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** An empty screen is an invitation to act, so the action is part of the state. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface-raised/40 p-stack-xl text-center ${className}`}
    >
      <div className="mb-stack flex h-11 w-11 items-center justify-center rounded-chip border border-line bg-surface-inset text-ink-muted">
        <Icon size={20} />
      </div>
      <h4 className="text-h3 text-ink-primary">{title}</h4>
      <p className="mt-1 max-w-sm text-body-sm text-ink-muted">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-stack-md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
