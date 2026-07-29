"use client";

import { Card } from "./Card";

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  height?: string;
}

export function ChartContainer({
  title,
  subtitle,
  action,
  children,
  className = "",
  height = "h-72",
}: ChartContainerProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className={`w-full ${height}`}>{children}</div>
    </Card>
  );
}
