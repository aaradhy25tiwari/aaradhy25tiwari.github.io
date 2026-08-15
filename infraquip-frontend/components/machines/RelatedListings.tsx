"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR, getListingTypeLabel, getConditionColor, cn } from "@/lib/utils";
import type { MachineListItem } from "@/types/machine";

interface RelatedListingsProps {
  currentSlug: string;
  categoryId: string;
  city: string;
}

interface SearchResponse {
  results: MachineListItem[];
  total: number;
}

export function RelatedListings({ currentSlug, categoryId, city }: RelatedListingsProps) {
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["related-listings", categoryId, city, currentSlug],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: categoryId,
        per_page: "4",
        sort: "newest",
      });
      const { data } = await apiClient.get<SearchResponse>(`/search?${params}`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter out the current listing
  const related = data?.results.filter((m) => m.slug !== currentSlug).slice(0, 3) ?? [];

  if (isLoading) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-5">Similar Equipment</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="skeleton h-40 w-full" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (related.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">Similar Equipment</h2>
        <Link
          href={`/machines?category=${categoryId}&city=${city}`}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((machine, i) => {
          const price = machine.contact_for_price
            ? "Contact for price"
            : machine.rental_price_daily
            ? `${formatINR(machine.rental_price_daily)}/day`
            : machine.purchase_price
            ? formatINR(machine.purchase_price)
            : "Enquire";

          return (
            <motion.div
              key={machine.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={`/machines/${machine.slug}`}
                className="block rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Image */}
                <div className="relative h-40 bg-muted overflow-hidden">
                  {machine.primary_image ? (
                    <Image
                      src={machine.primary_image.display_url}
                      alt={machine.primary_image.alt_text ?? machine.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                      {getListingTypeLabel(machine.listing_type)}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold line-clamp-1 mb-1">{machine.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {machine.make} · {machine.model} · {machine.year_of_manufacture}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {machine.city}, {machine.state}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-bold text-primary">{price}</span>
                    <span className={cn(
                      "text-[10px] rounded-full border px-2 py-0.5",
                      getConditionColor(machine.condition)
                    )}>
                      {machine.condition}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
