"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, Users, Package, MessageSquare, IndianRupee, Activity } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────
interface TimeseriesPoint {
  date: string;
  dau: number;
  new_users: number;
  new_listings: number;
  total_enquiries: number;
  total_revenue: number;
}

interface AnalyticsResponse {
  timeseries: TimeseriesPoint[];
  totals: {
    total_users: number;
    total_vendors: number;
    total_listings: number;
    approved_listings: number;
    total_enquiries: number;
    active_subscriptions: number;
    total_revenue: number;
  };
}

// ── Skeleton card ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="h-3 w-24 bg-muted rounded mb-3" />
      <div className="h-8 w-16 bg-muted rounded" />
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/90 backdrop-blur-sm shadow-xl p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold ml-auto pl-3">
            {entry.name === "Revenue" ? formatINR(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["admin-analytics", days],
    queryFn: async () => {
      const { data } = await apiClient.get<AnalyticsResponse>(`/admin/analytics/timeseries?days=${days}`);
      return data;
    },
  });

  const totals = data?.totals;
  const chartData = (data?.timeseries ?? []).map((d) => ({
    ...d,
    date: d.date.slice(5), // "MM-DD"
  }));

  const statCards = [
    {
      label: "Total Users",
      value: totals?.total_users ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active Vendors",
      value: totals?.total_vendors ?? 0,
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Listings",
      value: `${totals?.approved_listings ?? 0} / ${totals?.total_listings ?? 0}`,
      icon: Package,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      hint: "approved / total",
    },
    {
      label: "Total Enquiries",
      value: totals?.total_enquiries ?? 0,
      icon: MessageSquare,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Active Plans",
      value: totals?.active_subscriptions ?? 0,
      icon: Activity,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Total Revenue",
      value: formatINR(totals?.total_revenue ?? 0),
      icon: IndianRupee,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform performance overview.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 self-start">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                days === d
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{card.hint}</p>}
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", card.bg)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
            </div>
          ))}
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="h-3 w-32 bg-muted rounded mb-6" />
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : chartData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No data for the selected period yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue area chart */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              Revenue (₹)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(35 95% 52%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(35 95% 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total_revenue"
                  name="Revenue"
                  stroke="hsl(35 95% 52%)"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* New users & listings bar chart */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              New Users & Listings
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new_users" name="New Users" fill="hsl(35 95% 52%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="new_listings" name="New Listings" fill="hsl(220 70% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Enquiries & DAU line chart */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              Enquiries & Daily Active Users
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total_enquiries" name="Enquiries" stroke="hsl(280 70% 55%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="dau" name="DAU" stroke="hsl(35 95% 52%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
