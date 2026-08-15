"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, MessageSquare } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function AdminEnquiriesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/enquiries");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor all platform enquiries.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No enquiries yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((e: any) => (
            <Link key={e.id} href={`/dashboard/admin/enquiries/${e.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.machine_title}</p>
                <p className="text-xs text-muted-foreground">{e.customer_name} &middot; {e.vendor_name}</p>
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium shrink-0 ml-3",
                e.status === "pending" && "bg-amber-500/10 text-amber-500",
                e.status === "replied" && "bg-blue-500/10 text-blue-500",
                e.status === "closed" && "bg-muted text-muted-foreground",
              )}>{e.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
