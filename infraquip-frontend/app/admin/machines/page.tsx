"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { 
  Loader2, Package, CheckCircle, XCircle, Eye, Search, Filter, 
  AlertTriangle, Check, ExternalLink, MapPin, Calendar, IndianRupee, ShieldAlert
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, formatINR, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdminMachineItem {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  year_of_manufacture: number;
  status: "pending" | "approved" | "rejected" | "paused";
  rejection_reason?: string | null;
  vendor_name: string;
  vendor_email?: string | null;
  city: string;
  state: string;
  rental_price_daily?: number | null;
  rental_price_monthly?: number | null;
  rental_price_hourly?: number | null;
  rental_price_weekly?: number | null;
  contact_for_price: boolean;
  created_at: string;
  primary_image?: string | null;
  category_name?: string | null;
}

interface ApiResponse {
  results: AdminMachineItem[];
  total: number;
  page: number;
  per_page: number;
}

type TabStatus = "all" | "pending" | "approved" | "rejected" | "paused";

export default function AdminMachinesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewMachine, setPreviewMachine] = useState<AdminMachineItem | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["admin-machines", activeTab],
    queryFn: async () => {
      const url = activeTab === "all" ? "/admin/machines" : `/admin/machines?status=${activeTab}`;
      const { data } = await apiClient.get<ApiResponse>(url);
      return data;
    },
    refetchInterval: 30_000,
  });

  const machines = data?.results ?? [];

  const filteredMachines = useMemo(() => {
    if (!searchQuery.trim()) return machines;
    const q = searchQuery.toLowerCase().trim();
    return machines.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.make.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        m.vendor_name.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.state.toLowerCase().includes(q) ||
        (m.category_name && m.category_name.toLowerCase().includes(q))
    );
  }, [machines, searchQuery]);

  const pendingCount = useMemo(() => {
    return machines.filter((m) => m.status === "pending").length;
  }, [machines]);

  const approveMutation = useMutation({
    mutationFn: async (machineId: string) => {
      await apiClient.post(`/admin/review-queue/${machineId}`, { action: "approve" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-machines"] });
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setPreviewMachine(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiClient.post(`/admin/review-queue/${id}`, { action: "reject", rejection_reason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-machines"] });
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setRejectId(null);
      setRejectionReason("");
      setPreviewMachine(null);
    },
  });

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectionReason.trim()) return;
    rejectMutation.mutate({ id: rejectId, reason: rejectionReason.trim() });
  };

  const getPriceDisplay = (m: AdminMachineItem) => {
    if (m.contact_for_price) return "Contact for Price";
    if (m.rental_price_daily) return `${formatINR(m.rental_price_daily)}/day`;
    if (m.rental_price_monthly) return `${formatINR(m.rental_price_monthly)}/month`;
    if (m.rental_price_hourly) return `${formatINR(m.rental_price_hourly)}/hour`;
    if (m.rental_price_weekly) return `${formatINR(m.rental_price_weekly)}/week`;
    return "Rate on request";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machine Listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, approve, or manage all equipment listings across the platform.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {(
            [
              { id: "all" as const, label: "All Listings", badge: undefined },
              { id: "pending" as const, label: "Pending Review", badge: pendingCount > 0 ? pendingCount : undefined },
              { id: "approved" as const, label: "Approved", badge: undefined },
              { id: "rejected" as const, label: "Rejected", badge: undefined },
              { id: "paused" as const, label: "Paused", badge: undefined },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    activeTab === tab.id
                      ? "bg-primary-foreground text-primary"
                      : "bg-amber-500 text-white"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, make, vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading machines...</p>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-14 text-center bg-card/50">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-semibold">No machine listings found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No machines match "${searchQuery}". Try searching with different keywords.`
              : activeTab === "pending"
              ? "All submitted machine listings have been reviewed and approved."
              : "No machine listings currently match this filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredMachines.map((machine) => (
            <div
              key={machine.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              {/* Thumbnail + Main Info */}
              <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                {machine.primary_image ? (
                  <img
                    src={machine.primary_image}
                    alt={machine.title}
                    className="h-16 w-20 sm:h-18 sm:w-24 object-cover rounded-xl border border-border bg-muted flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-20 sm:h-18 sm:w-24 rounded-xl bg-muted flex items-center justify-center border border-border flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-foreground truncate">
                      {machine.title}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        machine.status === "approved" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                        machine.status === "pending" && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                        machine.status === "rejected" && "bg-destructive/10 text-destructive border border-destructive/20",
                        machine.status === "paused" && "bg-muted text-muted-foreground border border-border"
                      )}
                    >
                      {machine.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{machine.make} {machine.model}</span>
                    <span>&middot;</span>
                    <span>{machine.category_name || "General"}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {machine.city}, {machine.state}
                    </span>
                    <span>&middot;</span>
                    <span className="text-primary font-semibold">{getPriceDisplay(machine)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                    <span>Vendor: <strong className="text-foreground/90 font-medium">{machine.vendor_name}</strong></span>
                    <span>&middot;</span>
                    <span>Submitted {formatRelativeTime(machine.created_at)}</span>
                    {machine.rejection_reason && (
                      <span className="text-destructive font-medium">
                        &middot; Reason: {machine.rejection_reason}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border justify-end flex-wrap">
                {/* Preview */}
                <button
                  type="button"
                  onClick={() => setPreviewMachine(machine)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>

                {/* Approve Button (shown if not already approved) */}
                {machine.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(machine.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-2 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </button>
                )}

                {/* Reject Button (shown if not rejected) */}
                {machine.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectId(machine.id);
                      setRejectionReason("");
                    }}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                )}

                {/* Public Listing Link if approved */}
                {machine.status === "approved" && (
                  <Link
                    href={`/machines/${machine.slug}`}
                    target="_blank"
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Public
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reject Modal ────────────────────────────────────── */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <form onSubmit={handleRejectSubmit}>
            <DialogHeader>
              <DialogTitle>Reject Machine Listing</DialogTitle>
              <DialogDescription>
                Provide a specific reason for rejection. This feedback will be sent to the vendor so they can update and resubmit.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  "Poor / blurry image quality",
                  "Missing equipment specifications",
                  "Unrealistic rental pricing",
                  "Incorrect machine category",
                  "Duplicate machine listing",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason((prev) => (prev ? `${prev}, ${reason}` : reason))}
                    className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs transition hover:bg-muted cursor-pointer"
                  >
                    + {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejection..."
                required
                className="w-full rounded-xl border border-input bg-background p-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary min-h-[110px]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rejection
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal ───────────────────────────────────── */}
      <Dialog open={!!previewMachine} onOpenChange={(o) => !o && setPreviewMachine(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {previewMachine && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6 gap-3">
                  <div>
                    <DialogTitle className="text-xl">{previewMachine.title}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Submitted by <span className="font-semibold text-foreground">{previewMachine.vendor_name}</span> &middot; {formatRelativeTime(previewMachine.created_at)}
                    </DialogDescription>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                      previewMachine.status === "approved" && "bg-emerald-500/10 text-emerald-500",
                      previewMachine.status === "pending" && "bg-amber-500/10 text-amber-500",
                      previewMachine.status === "rejected" && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {previewMachine.status}
                  </span>
                </div>
              </DialogHeader>

              <div className="my-6 grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  {previewMachine.primary_image ? (
                    <img
                      src={previewMachine.primary_image}
                      alt={previewMachine.title}
                      className="w-full aspect-[4/3] object-cover rounded-2xl border border-border shadow-sm"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-2xl bg-muted flex items-center justify-center border border-border border-dashed">
                      <span className="text-sm text-muted-foreground">No photos uploaded</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                      Equipment Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2 text-xs sm:text-sm">
                      <p className="text-muted-foreground">Make / Brand:</p>
                      <p className="font-semibold">{previewMachine.make}</p>
                      <p className="text-muted-foreground">Model:</p>
                      <p className="font-semibold">{previewMachine.model}</p>
                      <p className="text-muted-foreground">Year:</p>
                      <p className="font-semibold">{previewMachine.year_of_manufacture}</p>
                      <p className="text-muted-foreground">Category:</p>
                      <p className="font-semibold">{previewMachine.category_name || "General"}</p>
                      <p className="text-muted-foreground">Location:</p>
                      <p className="font-semibold">{previewMachine.city}, {previewMachine.state}</p>
                      <p className="text-muted-foreground">Pricing:</p>
                      <p className="font-semibold text-primary">{getPriceDisplay(previewMachine)}</p>
                    </div>
                  </div>

                  {previewMachine.rejection_reason && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      <strong>Rejection Reason:</strong> {previewMachine.rejection_reason}
                    </div>
                  )}

                  <Link
                    href={`/machines/${previewMachine.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    Open full machine preview page <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {previewMachine.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectId(previewMachine.id);
                      setRejectionReason("");
                    }}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" /> Reject Listing
                  </button>
                )}
                {previewMachine.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(previewMachine.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve & Publish
                  </button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
