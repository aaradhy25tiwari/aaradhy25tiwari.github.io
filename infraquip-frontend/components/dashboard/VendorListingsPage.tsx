"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Plus, Eye, Pencil, Pause, Play, Trash2, Search, X } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR, formatRelativeTime, cn } from "@/lib/utils";
import type { MachineListItem, MachineStatus } from "@/types/machine";

const statusStyles: Record<string, string> = {
  approved: "badge-status-approved",
  pending: "badge-status-pending",
  rejected: "badge-status-rejected",
  paused: "badge-status-paused",
};

export function VendorListingsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<{ results: MachineListItem[]; total: number; total_pages: number }>({
    queryKey: ["vendor-listings", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: "10" });
      if (statusFilter) params.set("status_filter", statusFilter);
      const { data } = await apiClient.get(`/vendor/listings?${params}`);
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiClient.patch(`/vendor/listings/${listingId}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiClient.delete(`/vendor/listings/${listingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
    },
  });

  const filters = [
    { label: "All", value: null },
    { label: "Approved", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "Paused", value: "paused" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} listing${data.total !== 1 ? "s" : ""}` : "Manage your equipment"}
          </p>
        </div>
        <Link
          href="/dashboard/vendor/listings/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Machine
        </Link>
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
          Failed to load listings.
        </div>
      ) : !data?.results.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No listings found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter ? "Try a different filter." : "Add your first machine to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.results.map((machine) => (
            <div
              key={machine.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {machine.primary_image?.display_url ? (
                  <img src={machine.primary_image.display_url} alt={machine.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No img</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{machine.title}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[machine.status])}>
                    {machine.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {machine.make} &middot; {machine.model} &middot; {machine.city}, {machine.state}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{machine.views_count} views</span>
                  <span>{machine.enquiries_count} enquiries</span>
                  {machine.rental_price_daily && (
                    <span className="font-semibold text-foreground">{formatINR(machine.rental_price_daily)}/day</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/dashboard/vendor/listings/${machine.id}/edit`}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Edit listing"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                {(machine.status === "approved" || machine.status === "paused") && (
                  <button
                    onClick={() => toggleMutation.mutate(machine.id)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={machine.status === "paused" ? "Activate listing" : "Pause listing"}
                  >
                    {machine.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={() => { if (confirm("Delete this listing?")) deleteMutation.mutate(machine.id); }}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete listing"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link
                  href={`/machines/${machine.slug}`}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="View listing"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </div>
            </div>
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
