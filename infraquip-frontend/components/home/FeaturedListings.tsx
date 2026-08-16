"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Eye, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatINR, getConditionColor, getListingTypeLabel, cn } from "@/lib/utils";
import type { MachineListItem } from "@/types/machine";
import apiClient from "@/lib/api/client";

function MachineCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="skeleton h-40 sm:h-48 w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="flex justify-between mt-4">
          <div className="skeleton h-5 w-24 rounded" />
          <div className="skeleton h-5 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

function MachineCard({ machine }: { machine: MachineListItem }) {
  const listingUrl = `/machines/${machine.slug}`;
  const priceLabel =
    machine.contact_for_price
      ? "Contact for price"
      : machine.rental_price_daily
      ? `${formatINR(machine.rental_price_daily)}/day`
      : machine.purchase_price
      ? formatINR(machine.purchase_price)
      : "Enquire";

  return (
    <Link href={listingUrl} className="machine-card block group h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xl transition-all duration-300 overflow-hidden" aria-label={machine.title}>
      {/* Image */}
      <div className="relative h-40 sm:h-48 overflow-hidden bg-muted">
        {machine.primary_image ? (
          <Image
            src={machine.primary_image.display_url}
            alt={machine.primary_image.alt_text ?? machine.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-xs">No image</span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] sm:text-xs font-medium text-white w-fit">
            {getListingTypeLabel(machine.listing_type)}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 text-[8px] sm:text-[10px] font-medium text-white w-fit capitalize">
            {machine.ownership_type}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium border bg-background/90", getConditionColor(machine.condition))}>
            {machine.condition.charAt(0).toUpperCase() + machine.condition.slice(1)}
          </span>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[8px] sm:text-[10px] font-medium border bg-background/90", 
            machine.running_condition === "running" ? "text-emerald-500 border-emerald-200" : "text-destructive border-destructive/30"
          )}>
            {machine.running_condition === "running" ? "Running" : "Not Running"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1 line-clamp-1">
          {machine.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 line-clamp-1">
          {machine.make} {machine.model} · {machine.year_of_manufacture}
        </p>

        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{machine.city}, {machine.state}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-bold text-primary text-xs sm:text-sm">{priceLabel}</span>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{machine.views_count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedListings() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: MachineListItem[] }>(
        "/search?sort=newest&per_page=8&status=approved"
      );
      return data.results;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isEmpty = !isLoading && !isError && (!data || data.length === 0);
  const showSkeletons = isLoading;

  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-slate-950" aria-labelledby="featured-heading">
      <div className="section-container">
        <div className="flex items-end justify-between mb-10 border-b border-slate-200 dark:border-slate-800 pb-4 flex-wrap gap-3">
          <div>
            <h2 id="featured-heading" className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              POPULAR <span className="text-amber-500">EQUIPMENT</span>
            </h2>
          </div>
          <Link
            href="/machines"
            className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors uppercase"
          >
            VIEW ALL
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 2-col on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {showSkeletons
            ? Array.from({ length: 8 }).map((_, i) => <MachineCardSkeleton key={i} />)
            : data?.map((machine, i) => (
                <motion.div
                  key={machine.id}
                  initial={{ opacity: 1, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10px" }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <MachineCard machine={machine} />
                </motion.div>
              ))}
        </div>

        {/* Empty or error state */}
        {(isEmpty || isError) && (
          <div className="text-center py-12 sm:py-16">
            <p className="text-muted-foreground text-sm sm:text-base">
              {isError ? "Could not load listings right now." : "No listings yet."}{" "}
              <Link href="/register?role=vendor" className="text-primary hover:underline">
                Be the first to list your equipment!
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
