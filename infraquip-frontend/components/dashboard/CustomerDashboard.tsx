"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Heart, MessageSquare, Search, Clock, ArrowRight } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/utils";

interface CustomerStats {
  wishlist_count: number;
  total_enquiries: number;
}

interface EnquiryItem {
  id: string;
  machine_title: string;
  requirement_type: string;
  status: string;
  created_at: string;
}

export function CustomerDashboard() {
  const statsQuery = useQuery<CustomerStats>({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<CustomerStats>("/customer/stats");
      return data;
    },
  });

  const enquiriesQuery = useQuery<EnquiryItem[]>({
    queryKey: ["customer-enquiries"],
    queryFn: async () => {
      const { data } = await apiClient.get<EnquiryItem[]>("/customer/enquiries?page=1&per_page=5");
      return data;
    },
  });

  if (statsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const stats = statsQuery.data;
  const enquiries = enquiriesQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your saved listings and enquiries.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/customer/wishlist" className="stat-card group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500" />
            <span>Saved Listings</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.wishlist_count ?? 0}</p>
        </Link>
        <Link href="/dashboard/customer/enquiries" className="stat-card group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Enquiries Sent</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.total_enquiries ?? 0}</p>
        </Link>
        <Link href="/machines" className="stat-card group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 text-emerald-500" />
            <span>Browse Equipment</span>
          </div>
          <p className="mt-2 text-sm font-medium text-primary group-hover:underline">
            Search now &rarr;
          </p>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Enquiries</h2>
          <Link href="/dashboard/customer/enquiries" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {enquiries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              <p>No enquiries yet.</p>
              <Link href="/machines" className="mt-1 inline-block text-primary hover:underline">
                Browse equipment and send your first enquiry
              </Link>
            </div>
          ) : (
            enquiries.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/customer/enquiries/${e.id}`}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 transition hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.machine_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.requirement_type === "rent" ? "Wants to rent" : "Wants to buy"}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                    e.status === "pending" && "bg-amber-500/10 text-amber-500",
                    e.status === "replied" && "bg-blue-500/10 text-blue-500",
                    e.status === "closed" && "bg-muted text-muted-foreground",
                  )}>
                    {e.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(e.created_at)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
