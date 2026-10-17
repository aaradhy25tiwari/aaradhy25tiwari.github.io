"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, RotateCw, CheckCircle, AlertTriangle } from "lucide-react";
import apiClient from "@/lib/api/client";
import type { Machine } from "@/types/machine";
import { ListingForm } from "@/components/dashboard/ListingForm";
import Link from "next/link";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: machine, isLoading, error } = useQuery<Machine>({
    queryKey: ["vendor-listing", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Machine>(`/vendor/listings/${id}`);
      return data;
    },
    retry: false,
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/vendor/listings/${id}/reactivate`);
      return data;
    },
    onSuccess: (data: { message?: string }) => {
      setSuccessMsg(data?.message || "Listing reactivated successfully! It is now active for 30 days.");
      queryClient.invalidateQueries({ queryKey: ["vendor-listing", id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading listing...</p>
      </div>
    );
  }

  if (error || !machine) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg font-semibold">Listing not found</p>
        <p className="text-sm text-muted-foreground mt-2">
          This listing may not exist or you may not have permission to edit it.
        </p>
        <Link
          href="/dashboard/vendor/listings"
          className="inline-flex items-center gap-2 mt-6 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Edit Listing</h1>
          <p className="text-sm text-muted-foreground">{machine.title}</p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {(machine.is_expired || !machine.availability || machine.is_active === false) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                {machine.is_expired ? "Listing Expired" : "Listing Currently Inactive / Unavailable"}
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                {machine.is_expired
                  ? "This listing reached its validity time limit and is hidden from search results. Reactivate to renew its validity for another 30 days."
                  : "This machine is currently marked unavailable or inactive. Reactivate to mark it available and extend its validity."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RotateCw className={`h-3.5 w-3.5 ${reactivateMutation.isPending ? "animate-spin" : ""}`} />
            {reactivateMutation.isPending ? "Reactivating..." : "Reactivate Listing"}
          </button>
        </div>
      )}

      <ListingForm machine={machine} />
    </div>
  );
}
