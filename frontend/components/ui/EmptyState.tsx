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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[16px] border border-dashed border-[#2A3140] bg-[#141824]/50 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1B2130] text-[#9BA4B5] mb-3 border border-[#2A3140]">
        <Icon size={22} />
      </div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 text-xs text-[#9BA4B5] max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
