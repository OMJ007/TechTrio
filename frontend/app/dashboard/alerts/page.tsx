"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, ShieldCheck, CheckCircle2, Inbox } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface AlertItem {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AlertItem[]>("/api/v1/alerts");
      setAlerts(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleMarkAllRead = async () => {
    try {
      await apiFetch("/api/v1/alerts/read-all", { method: "PUT" });
      await fetchAlerts();
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Security &amp; Spending Alerts</h1>
          <p className="text-xs font-mono text-[#9BA4B5]">
            Centralized hub for spending anomalies, subscription increases, and budget threshold warnings.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          Mark All as Read
        </Button>
      </div>

      {loading && <TableSkeleton />}

      {!loading && alerts.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No Active Alerts"
          description="All clear! Your financial accounts and spending patterns look healthy."
        />
      )}

      {!loading && alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((a) => (
            <Card key={a.id} hoverLift className={`p-5 flex items-start gap-4 ${a.is_read ? "opacity-60" : ""}`}>
              <div className="p-2.5 rounded-xl bg-[#1B2130] border border-[#2A3140] shrink-0">
                {a.alert_type === "warning" && <AlertTriangle className="text-[#F3B45B]" size={20} />}
                {a.alert_type === "negative" && <AlertTriangle className="text-[#F07178]" size={20} />}
                {a.alert_type === "positive" && <CheckCircle2 className="text-[#45D6A5]" size={20} />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">{a.title}</h3>
                  <span className="text-[11px] font-mono text-[#9BA4B5]">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-[#9BA4B5]">{a.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
