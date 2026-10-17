"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Plus, Eye, Pencil, Pause, Play, Trash2, Search, X, RotateCw, Clock, CheckCircle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR, formatRelativeTime, cn, scrollToTop } from "@/lib/utils";
import type { MachineListItem, MachineStatus } from "@/types/machine";

const statusStyles: Record<string, string> = {
  approved: "badge-status-approved",
  pending: "badge-status-pending",
  rejected: "badge-status-rejected",
  paused: "badge-status-paused",
};

export function VendorListingsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState<string | null>(urlStatus || null);
  const [page, setPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);

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

  const reactivateMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { data } = await apiClient.post(`/vendor/listings/${listingId}/reactivate`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
      setSuccessMsg(res.message || "Listing reactivated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
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
    { label: "Inactive / Expired", value: "inactive" },
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

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 animate-in fade-in duration-200">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={cn(
              "filter-pill transition cursor-pointer",
              statusFilter === f.value && "border-primary bg-primary/10 text-primary font-semibold",
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
          {data.results.map((machine) => {
            const isInactive = !machine.availability || machine.status === "paused" || machine.is_expired;

            return (
              <div
                key={machine.id}
                className={cn(
                  "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/90",
                  isInactive && "border-amber-500/30 bg-card/70"
                )}
              >
                <Link
                  href={`/machines/${machine.slug}`}
                  className="flex flex-1 items-start sm:items-center gap-4 min-w-0"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {machine.primary_image?.display_url ? (
                      <img src={machine.primary_image.display_url} alt={machine.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold group-hover:text-primary transition-colors">{machine.title}</span>
                      
                      {machine.is_expired ? (
                        <span className="rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Expired
                        </span>
                      ) : !machine.availability && machine.status === "approved" ? (
                        <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Unavailable
                        </span>
                      ) : (
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[machine.status])}>
                          {machine.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {machine.make} &middot; {machine.model} &middot; {machine.city}, {machine.state}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{machine.views_count} views</span>
                      <span>{machine.enquiries_count} enquiries</span>
                      {machine.rental_price_daily ? (
                        <span className="font-semibold text-foreground">{formatINR(machine.rental_price_daily)}/day</span>
                      ) : machine.rental_price_hourly ? (
                        <span className="font-semibold text-foreground">{formatINR(machine.rental_price_hourly)}/hr</span>
                      ) : machine.rental_price_monthly ? (
                        <span className="font-semibold text-foreground">{formatINR(machine.rental_price_monthly)}/mo</span>
                      ) : machine.rental_price_weekly ? (
                        <span className="font-semibold text-foreground">{formatINR(machine.rental_price_weekly)}/wk</span>
                      ) : machine.purchase_price ? (
                        <span className="font-semibold text-foreground">{formatINR(machine.purchase_price)}</span>
                      ) : machine.contact_for_price ? (
                        <span className="font-medium text-muted-foreground">Price on Request</span>
                      ) : null}

                      {machine.is_negotiable && !machine.contact_for_price && (
                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Negotiable
                        </span>
                      )}

                      {machine.expires_at && (
                        <span className={cn("flex items-center gap-1 text-[11px]", machine.is_expired ? "text-rose-500 font-semibold" : "text-muted-foreground")}>
                          <Clock className="h-3 w-3" />
                          {machine.is_expired
                            ? `Expired ${formatRelativeTime(machine.expires_at)}`
                            : `Valid until ${new Date(machine.expires_at).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                
                <div className="flex shrink-0 items-center gap-1.5 z-10 justify-end flex-wrap">
                  {/* Reactivate Button for inactive, unavailable, paused, or expired listings */}
                  {isInactive && (
                    <button
                      onClick={() => reactivateMutation.mutate(machine.id)}
                      disabled={reactivateMutation.isPending}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-600 transition shadow-sm cursor-pointer disabled:opacity-50"
                      title="Reactivate this machine listing"
                    >
                      {reactivateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5" />
                      )}
                      Reactivate
                    </button>
                  )}

                  <Link
                    href={`/dashboard/vendor/listings/${machine.id}/edit`}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Edit listing"
                    title="Edit listing"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>

                  {(machine.status === "approved" || machine.status === "paused") && (
                    <button
                      onClick={() => toggleMutation.mutate(machine.id)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                      aria-label={isInactive ? "Activate listing" : "Pause listing"}
                      title={isInactive ? "Activate listing" : "Pause listing"}
                    >
                      {isInactive ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </button>
                  )}

                  <button
                    onClick={() => { if (confirm("Delete this listing?")) deleteMutation.mutate(machine.id); }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    aria-label="Delete listing"
                    title="Delete listing"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/machines/${machine.slug}`}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="View listing preview"
                    title="View listing preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}

          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPage(p);
                    scrollToTop();
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition cursor-pointer",
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
