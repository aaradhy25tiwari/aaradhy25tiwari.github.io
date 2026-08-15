"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function AdminDisputesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/disputes");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Disputes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resolve disputes between customers and vendors.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No disputes</p>
          <p className="text-sm text-muted-foreground">All clear — no disputes have been raised.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((d: any) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{d.machine_title}</p>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  d.status === "open" && "bg-rose-500/10 text-rose-500",
                  d.status === "resolved" && "bg-emerald-500/10 text-emerald-500",
                )}>{d.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{d.customer_name} vs {d.vendor_name}</p>
              <p className="mt-2 text-sm">{d.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
