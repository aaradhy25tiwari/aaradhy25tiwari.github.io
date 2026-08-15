"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Heart, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR } from "@/lib/utils";

interface WishlistItem {
  id: string;
  machine_id: string;
  machine_title: string;
  machine_slug: string;
  city: string;
  rental_price_daily?: number;
  primary_image?: string;
  added_at: string;
}

export function CustomerWishlistPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{ results: WishlistItem[]; total: number }>({
    queryKey: ["customer-wishlist"],
    queryFn: async () => {
      const { data } = await apiClient.get("/customer/wishlist");
      return data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (machineId: string) => {
      await apiClient.delete(`/customer/wishlist/${machineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-wishlist"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Saved Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} saved machine${data.total !== 1 ? "s" : ""}` : "Machines you've saved"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
          Failed to load wishlist.
        </div>
      ) : !data?.results.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No saved listings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse equipment and click the heart icon to save machines you're interested in.
          </p>
          <Link
            href="/machines"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Browse Equipment
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.results.map((item) => (
            <div key={item.id} className="group relative rounded-2xl border border-border bg-card overflow-hidden transition hover:border-primary/30">
              <Link href={`/machines/${item.machine_slug}`} className="block">
                <div className="aspect-[16/10] bg-muted">
                  {item.primary_image ? (
                    <img src={item.primary_image} alt={item.machine_title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold truncate">{item.machine_title}</p>
                  <p className="text-sm text-muted-foreground">{item.city}</p>
                  {item.rental_price_daily && (
                    <p className="mt-1 font-semibold text-primary">{formatINR(item.rental_price_daily)}<span className="text-xs text-muted-foreground font-normal">/day</span></p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => removeMutation.mutate(item.machine_id)}
                className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
