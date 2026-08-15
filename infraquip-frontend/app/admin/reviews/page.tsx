"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function AdminReviewsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/reviews");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">Moderate machine and vendor reviews.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.reviewer_name}</p>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(r.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{r.machine_title}</p>
              <p className="mt-2 text-sm">{r.comment}</p>
              <div className="mt-3">
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  r.status === "approved" && "bg-emerald-500/10 text-emerald-500",
                  r.status === "pending" && "bg-amber-500/10 text-amber-500",
                  r.status === "rejected" && "bg-destructive/10 text-destructive",
                )}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
