"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Heart, MessageSquare, Search, Handshake, ArrowRight } from "lucide-react";
import apiClient from "@/lib/api/client";

interface CustomerStats {
  wishlist_count: number;
  total_enquiries: number;
}

export function BrokerDashboard() {
  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/me");
      return data;
    },
  });

  const statsQuery = useQuery<CustomerStats>({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<CustomerStats>("/customer/stats");
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

  const user = profileQuery.data;
  const brokerProfile = user?.broker_profile;
  const stats = statsQuery.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ""}. Manage your saved listings and enquiries.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/broker/wishlist" className="stat-card group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500" />
            <span>Saved Listings</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.wishlist_count ?? 0}</p>
        </Link>
        <Link href="/dashboard/broker/enquiries" className="stat-card group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Enquiries Sent</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.total_enquiries ?? 0}</p>
        </Link>
        <Link href="/machines" className="stat-card group">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 text-emerald-500" />
            <span>Source Equipment</span>
          </div>
          <p className="mt-2 text-sm font-medium text-primary group-hover:underline">
            Search now &rarr;
          </p>
        </Link>
      </div>

      {/* Broker profile card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
              <Handshake className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{brokerProfile?.company_name ?? user?.full_name ?? "Broker Profile"}</h2>
              <p className="text-sm text-muted-foreground">
                {[brokerProfile?.city, brokerProfile?.state].filter(Boolean).join(", ") || "India"}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            Edit profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {brokerProfile?.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{brokerProfile.description}</p>
        )}
      </div>
    </div>
  );
}
