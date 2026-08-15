"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function AdminMachinesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-machines"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/machines");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Machines</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, approve, or reject machine listings.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No machines yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.vendor_name} &middot; {m.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  m.status === "approved" && "bg-emerald-500/10 text-emerald-500",
                  m.status === "pending" && "bg-amber-500/10 text-amber-500",
                  m.status === "rejected" && "bg-destructive/10 text-destructive",
                )}>{m.status}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(m.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
