"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Users, Building2, MessageSquare, TrendingUp, DollarSign, Shield } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR } from "@/lib/utils";

interface AdminStats {
  total_machines: number;
  total_users: number;
  total_vendors: number;
  pending_reviews: number;
  total_enquiries: number;
  active_subscriptions: number;
  monthly_revenue: number;
}

export function AdminOverviewPage() {
  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminStats>("/admin/stats");
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const stats = data;

  const cards = [
    { label: "Total Machines", value: stats?.total_machines ?? 0, icon: Package, color: "text-blue-500" },
    { label: "Total Users", value: stats?.total_users ?? 0, icon: Users, color: "text-emerald-500" },
    { label: "Vendors", value: stats?.total_vendors ?? 0, icon: Building2, color: "text-amber-500" },
    { label: "Pending Reviews", value: stats?.pending_reviews ?? 0, icon: TrendingUp, color: "text-rose-500" },
    { label: "Total Enquiries", value: stats?.total_enquiries ?? 0, icon: MessageSquare, color: "text-violet-500" },
    { label: "Active Subscriptions", value: stats?.active_subscriptions ?? 0, icon: Shield, color: "text-cyan-500", },
    { label: "Monthly Revenue", value: stats ? formatINR(stats.monthly_revenue) : "---", icon: DollarSign, color: "text-green-500" },
  ].map((c) => ({ ...c, icon: c.icon }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide statistics and quick actions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Pending Reviews</h2>
          {stats && stats.pending_reviews > 0 ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {stats.pending_reviews} machine{stats.pending_reviews > 1 ? "s" : ""} await{stats.pending_reviews === 1 ? "s" : ""} review.
              </p>
              {/* Quick review list would go here */}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">All machines reviewed.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Activity feed will be displayed here once the events endpoint is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
