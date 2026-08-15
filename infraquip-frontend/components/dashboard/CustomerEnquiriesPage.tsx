"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, MessageSquare } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

interface EnquiryItem {
  id: string;
  machine_title: string;
  requirement_type: string;
  status: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  replied: "bg-blue-500/10 text-blue-500",
  closed: "bg-muted text-muted-foreground",
};

export function CustomerEnquiriesPage() {
  const { data, isLoading, error } = useQuery<EnquiryItem[]>({
    queryKey: ["customer-enquiries"],
    queryFn: async () => {
      const { data } = await apiClient.get<EnquiryItem[]>("/customer/enquiries");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.length} enquiry${data.length !== 1 ? "ies" : ""}` : "Track your enquiries"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
          Failed to load enquiries.
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No enquiries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse equipment and send an enquiry to a vendor.
          </p>
          <Link
            href="/machines"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Browse Equipment
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/customer/enquiries/${e.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.machine_title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.requirement_type === "rent" ? "Wanting to rent" : "Wanting to buy"}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium", statusStyles[e.status])}>
                  {e.status}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(e.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
