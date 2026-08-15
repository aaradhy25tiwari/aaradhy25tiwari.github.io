"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, MessageSquare, Filter, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

interface EnquiryItem {
  id: string;
  requirement_type: string;
  status: string;
  is_read: boolean;
  customer_name: string;
  machine_title: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  replied: "bg-blue-500/10 text-blue-500",
  closed: "bg-muted text-muted-foreground",
};

export function VendorEnquiriesPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<{ results: EnquiryItem[]; total: number; total_pages: number }>({
    queryKey: ["vendor-enquiries", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: "15" });
      if (statusFilter) params.set("status_filter", statusFilter);
      const { data } = await apiClient.get(`/vendor/enquiries?${params}`);
      return data;
    },
  });

  const filters = [
    { label: "All", value: null },
    { label: "Unread", value: "pending" },
    { label: "Replied", value: "replied" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} enquiry${data.total !== 1 ? "ies" : "y"}` : "Customer messages"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={cn(
              "filter-pill transition",
              statusFilter === f.value && "border-primary bg-primary/10 text-primary",
            )}
          >
            {f.label}
            {statusFilter === f.value && <X className="h-3 w-3" />}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
          Failed to load enquiries.
        </div>
      ) : !data?.results.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No enquiries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Customer enquiries will appear here once they start coming in.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.results.map((enquiry) => (
            <Link
              key={enquiry.id}
              href={`/dashboard/vendor/enquiries/${enquiry.id}`}
              className={cn(
                "flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:border-primary/30",
                !enquiry.is_read ? "border-primary/20" : "border-border",
              )}
            >
              <div className="relative shrink-0">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  !enquiry.is_read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  <MessageSquare className="h-5 w-5" />
                </div>
                {!enquiry.is_read && (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate font-medium", !enquiry.is_read && "font-semibold")}>
                    {enquiry.customer_name}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusStyles[enquiry.status])}>
                    {enquiry.status}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Re: {enquiry.machine_title} &middot; {enquiry.requirement_type === "rent" ? "Wants to rent" : "Wants to buy"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(enquiry.created_at)}
              </span>
            </Link>
          ))}

          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition",
                    page === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
