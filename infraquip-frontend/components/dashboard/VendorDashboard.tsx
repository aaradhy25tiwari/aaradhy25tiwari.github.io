"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Plus, ClipboardList, Eye, MessageSquare, Activity, AlertCircle, CheckCircle2, PauseCircle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR, formatRelativeTime, getConditionColor } from "@/lib/utils";
import type { MachineListItem } from "@/types/machine";

interface VendorStats {
  total_listings: number;
  approved_listings: number;
  pending_listings: number;
  paused_listings: number;
  total_views: number;
  total_enquiries: number;
  unread_enquiries: number;
}

interface EnquiryItem {
  id: string;
  requirement_type: string;
  status: string;
  is_read: boolean;
  customer_name: string;
  machine_title: string;
  created_at: string;
}

export function VendorDashboard() {
  const statsQuery = useQuery<VendorStats>({
    queryKey: ["vendor-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<VendorStats>("/vendor/stats");
      return data;
    },
  });

  const listingsQuery = useQuery<{ results: MachineListItem[] }>({
    queryKey: ["vendor-listings"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: MachineListItem[] }>("/vendor/listings?page=1&per_page=5");
      return data;
    },
  });

  const enquiriesQuery = useQuery<{ results: EnquiryItem[] }>({
    queryKey: ["vendor-enquiries"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: EnquiryItem[] }>("/vendor/enquiries?page=1&per_page=5");
      return data;
    },
  });

  if (statsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-3">Loading dashboard...</p>
      </div>
    );
  }

  if (statsQuery.error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
        <p>Unable to load dashboard data. Please refresh the page.</p>
      </div>
    );
  }

  const stats = statsQuery.data!;
  const listings = listingsQuery.data?.results ?? [];
  const enquiries = enquiriesQuery.data?.results ?? [];

  const statCards = [
    {
      label: "Approved",
      value: stats.approved_listings,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "Pending",
      value: stats.pending_listings,
      icon: AlertCircle,
      color: "text-amber-500",
    },
    {
      label: "Paused",
      value: stats.paused_listings ?? 0,
      icon: PauseCircle,
      color: "text-muted-foreground",
    },
    {
      label: "Total Views",
      value: stats.total_views,
      icon: Eye,
      color: "text-primary",
    },
    {
      label: "Enquiries",
      value: stats.total_enquiries,
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      label: "Unread",
      value: stats.unread_enquiries,
      icon: Activity,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your listings, enquiries, and platform performance.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span>{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Listings</h2>
            <Link href="/dashboard/vendor/listings" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {listings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                <p>No listings yet.</p>
                <Link href="/dashboard/vendor/listings/new" className="mt-2 inline-block text-primary hover:underline">
                  Add your first machine
                </Link>
              </div>
            ) : (
              listings.map((m) => (
                <Link
                  key={m.id}
                  href={`/machines/${m.slug}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 transition hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.make} &middot; {m.city}, {m.state}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{m.views_count} views</span>
                    {m.rental_price_daily && <span className="font-semibold text-foreground">{formatINR(m.rental_price_daily)}/day</span>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Enquiries</h2>
            <Link href="/dashboard/vendor/enquiries" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {enquiries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No enquiries yet. They will appear here when customers reach out.
              </div>
            ) : (
              enquiries.map((e) => (
                <Link
                  key={e.id}
                  href={`/dashboard/vendor/enquiries/${e.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 transition hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!e.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      <p className="truncate text-sm font-medium">{e.customer_name}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{e.machine_title}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(e.created_at)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
