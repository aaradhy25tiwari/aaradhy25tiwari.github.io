"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import apiClient from "@/lib/api/client";
import type { Machine } from "@/types/machine";
import { ListingForm } from "@/components/dashboard/ListingForm";
import Link from "next/link";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: machine, isLoading, error } = useQuery<Machine>({
    queryKey: ["vendor-listing", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Machine>(`/vendor/listings/${id}`);
      return data;
    },
    retry: false,
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

      <ListingForm machine={machine} />
    </div>
  );
}
