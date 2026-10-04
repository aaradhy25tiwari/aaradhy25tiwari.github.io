"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Package, Users, Building2, MessageSquare, TrendingUp, DollarSign, Shield, ArrowUpRight } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR } from "@/lib/utils";

interface AdminStats {
  total_machines?: number;
  total_listings?: number;
  total_users: number;
  total_vendors: number;
  pending_reviews?: number;
  pending_review?: number;
  total_enquiries: number;
  active_subscriptions?: number;
  monthly_revenue?: number;
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
  const totalMachines = stats?.total_listings ?? stats?.total_machines ?? 0;
  const pendingReviews = stats?.pending_review ?? stats?.pending_reviews ?? 0;

  const cards = [
    { label: "Total Machines", value: totalMachines, icon: Package, color: "text-blue-500", href: "/admin/machines" },
    { label: "Total Users", value: stats?.total_users ?? 0, icon: Users, color: "text-emerald-500", href: "/admin/users" },
    { label: "Vendors", value: stats?.total_vendors ?? 0, icon: Building2, color: "text-amber-500", href: "/admin/vendors" },
    { label: "Pending Reviews", value: pendingReviews, icon: TrendingUp, color: "text-rose-500", href: "/admin/review-queue" },
    { label: "Total Enquiries", value: stats?.total_enquiries ?? 0, icon: MessageSquare, color: "text-violet-500", href: "/admin/enquiries" },
    { label: "Active Subscriptions", value: stats?.active_subscriptions ?? 0, icon: Shield, color: "text-cyan-500", href: "/admin/analytics" },
    { label: "Monthly Revenue", value: stats?.monthly_revenue ? formatINR(stats.monthly_revenue) : "---", icon: DollarSign, color: "text-green-500", href: "/admin/analytics" },
  ].map((c) => ({ ...c, icon: c.icon }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide statistics and quick actions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group relative rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:bg-card/80 hover:shadow-sm hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{card.label}</p>
              <div className="flex items-center gap-1">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending Reviews</h2>
            <Link
              href="/admin/review-queue"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View Queue <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {pendingReviews > 0 ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {pendingReviews} machine{pendingReviews > 1 ? "s" : ""} await{pendingReviews === 1 ? "s" : ""} review.
              </p>
              <Link
                href="/admin/review-queue"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Review Listings <ArrowUpRight className="h-3 w-3" />
              </Link>
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
