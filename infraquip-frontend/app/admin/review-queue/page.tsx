"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, Eye, AlertTriangle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PendingMachine {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  vendor_name: string;
  vendor_email?: string;
  city: string;
  state: string;
  created_at: string;
  primary_image?: string;
  category_name?: string;
}

export default function AdminReviewQueuePage() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewMachine, setPreviewMachine] = useState<PendingMachine | null>(null);

  const { data, isLoading } = useQuery<{ results: PendingMachine[], total: number }>({
    queryKey: ["admin-review-queue"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/review-queue");
      return data;
    },
  });

  const machines = data?.results ?? [];

  const approveMutation = useMutation({
    mutationFn: async (machineId: string) => {
      await apiClient.post(`/admin/review-queue/${machineId}`, { action: "approve" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-machines"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setPreviewMachine(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiClient.post(`/admin/review-queue/${id}`, { action: "reject", rejection_reason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-machines"] });
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

  const [masterSuccessMsg, setMasterSuccessMsg] = useState<string | null>(null);

  const addToMasterMutation = useMutation({
    mutationFn: async ({
      listingId,
      make,
      model,
      category_name,
      add_type,
    }: {
      listingId: string;
      make: string;
      model: string;
      category_name?: string;
      add_type: string;
    }) => {
      const { data } = await apiClient.post(`/admin/review-queue/${listingId}/add-to-master`, {
        make,
        model,
        category_name,
        add_type,
      });
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["master-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["admin-master-catalog"] });
      setMasterSuccessMsg(res.message || "Successfully updated master catalog!");
      setTimeout(() => setMasterSuccessMsg(null), 4000);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve or reject pending machine listings.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : machines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-4 font-medium">All caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">No machines pending review.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {machines.map((machine) => (
            <div key={machine.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1 flex gap-4 items-center">
                {machine.primary_image ? (
                  <img src={machine.primary_image} alt={machine.title} className="h-12 w-16 object-cover rounded-md bg-muted" />
                ) : (
                  <div className="h-12 w-16 rounded-md bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No img</span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm lg:text-base truncate">{machine.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {machine.vendor_name} &middot; <span className="font-semibold text-foreground">{machine.make}</span> {machine.model} &middot; {machine.city}, {machine.state} &middot; {formatRelativeTime(machine.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPreviewMachine(machine)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition hover:bg-muted"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview & Master Options
                </button>
                <button
                  onClick={() => approveMutation.mutate(machine.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => {
                    setRejectId(machine.id);
                    setRejectionReason("");
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <form onSubmit={handleRejectSubmit}>
            <DialogHeader>
              <DialogTitle>Reject Listing</DialogTitle>
              <DialogDescription>
                Provide a reason for rejection. This will be emailed to the vendor so they can fix the issues and resubmit.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              {/* Quick options */}
              <div className="flex flex-wrap gap-2">
                {["Blurry photos", "Price unrealistic", "Missing technical specs", "Duplicate listing"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason((prev) => prev ? `${prev}, ${reason}` : reason)}
                    className="rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs transition hover:bg-muted"
                  >
                    + {reason}
                  </button>
                ))}
              </div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Type rejection reason here..."
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rejection
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview & Master Catalog Options Modal */}
      <Dialog open={!!previewMachine} onOpenChange={(o) => { if (!o) { setPreviewMachine(null); setMasterSuccessMsg(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {previewMachine && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6">
                  <div>
                    <DialogTitle className="text-xl">{previewMachine.title}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Submitted by <span className="font-medium text-foreground">{previewMachine.vendor_name}</span> &middot; {formatRelativeTime(previewMachine.created_at)}
                    </DialogDescription>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500 flex items-center gap-1 whitespace-nowrap">
                    <AlertTriangle className="h-3 w-3" /> Pending
                  </span>
                </div>
              </DialogHeader>
              
              <div className="my-6 grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  {previewMachine.primary_image ? (
                    <img 
                      src={previewMachine.primary_image} 
                      alt={previewMachine.title} 
                      className="w-full aspect-[4/3] object-cover rounded-xl border border-border"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-xl bg-muted flex items-center justify-center border border-border border-dashed">
                      <span className="text-sm text-muted-foreground">No photos uploaded</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Machine Details</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <p className="text-muted-foreground">Category:</p>
                      <p className="font-medium">{previewMachine.category_name || "GENERAL"}</p>
                      <p className="text-muted-foreground">Make / Brand:</p>
                      <p className="font-medium">{previewMachine.make}</p>
                      <p className="text-muted-foreground">Model:</p>
                      <p className="font-medium">{previewMachine.model}</p>
                      <p className="text-muted-foreground">Location:</p>
                      <p className="font-medium">{previewMachine.city}, {previewMachine.state}</p>
                    </div>
                  </div>
                  
                  {/* Master Catalog Management Section for Admin */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Master Catalog Options
                      </h4>
                      <span className="text-[11px] text-muted-foreground">Updates list for all vendors</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Add this vendor's make and/or model to the platform master list:
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          addToMasterMutation.mutate({
                            listingId: previewMachine.id,
                            make: previewMachine.make,
                            model: previewMachine.model,
                            category_name: previewMachine.category_name,
                            add_type: "both",
                          })
                        }
                        disabled={addToMasterMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {addToMasterMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                        + Add Make & Model to Master
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addToMasterMutation.mutate({
                            listingId: previewMachine.id,
                            make: previewMachine.make,
                            model: "Standard Series",
                            category_name: previewMachine.category_name,
                            add_type: "make_only",
                          })
                        }
                        disabled={addToMasterMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50 cursor-pointer"
                      >
                        + Add Make Only
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addToMasterMutation.mutate({
                            listingId: previewMachine.id,
                            make: previewMachine.make,
                            model: previewMachine.model,
                            category_name: previewMachine.category_name,
                            add_type: "model_only",
                          })
                        }
                        disabled={addToMasterMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50 cursor-pointer"
                      >
                        + Add Model Only
                      </button>
                    </div>

                    {masterSuccessMsg && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 p-2 text-xs font-medium text-emerald-600 animate-in fade-in duration-200">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{masterSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  onClick={() => {
                    setRejectId(previewMachine.id);
                    setRejectionReason("");
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Reject Listing
                </button>
                <button
                  onClick={() => approveMutation.mutate(previewMachine.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" /> Approve & Publish
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

