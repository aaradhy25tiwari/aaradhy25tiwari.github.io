"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, CheckCircle, XCircle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function AdminVendorsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data: { results } } = await apiClient.get("/admin/vendors");
      return results;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verify and manage vendor accounts.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No vendors yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((v: any) => (
            <div key={v.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                {v.is_verified ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-medium">{v.business_name || v.full_name}</p>
                  <p className="text-xs text-muted-foreground">{v.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  v.is_verified ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500",
                )}>{v.is_verified ? "Verified" : "Unverified"}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(v.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
