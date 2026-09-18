"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-chip bg-surface-inset/70 ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="elev-base rounded-card p-card-pad">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-chip" />
      </div>
      <Skeleton className="mt-stack h-7 w-32" />
      <Skeleton className="mt-stack-sm h-3 w-full" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-stack-sm">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

/**
 * Mirrors the real dashboard layout — hero, stat row, two-up, chart split — so the
 * page does not jump when data lands. The previous version showed a 4-column stat
 * grid that resolved into an entirely different arrangement.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-stack-lg" aria-busy="true" aria-label="Loading dashboard">
      <div className="elev-base rounded-card p-card-pad">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-stack h-10 w-72" />
        <Skeleton className="mt-stack-md h-9 w-56" />
      </div>

      <div className="grid gap-stack-md sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="elev-base rounded-card p-card-pad">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-stack h-7 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-stack-md lg:grid-cols-3">
        <div className="elev-base rounded-card p-card-pad lg:col-span-2">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="mt-stack-md h-44 w-full" />
        </div>
        <div className="elev-base rounded-card p-card-pad">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-stack-md h-4 w-full" />
          <Skeleton className="mt-stack-sm h-4 w-full" />
          <Skeleton className="mt-stack-sm h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
