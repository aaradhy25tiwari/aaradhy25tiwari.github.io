"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Script from "next/script";
import {
  Loader2, MapPin, Star, Eye, ArrowRight,
  MessageSquare, Heart, Calendar, Award, Clock, BadgeCheck
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR, formatDate, getListingTypeLabel, getConditionColor, cn } from "@/lib/utils";
import type { Machine } from "@/types/machine";
import { PhotoCarousel } from "@/components/machines/PhotoCarousel";
import { RelatedListings } from "@/components/machines/RelatedListings";
import { MapView } from "@/components/shared/MapView";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MachineDetailClientProps {
  slug: string;
}

export function MachineDetailClient({ slug }: MachineDetailClientProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wishlisted, setWishlisted] = useState<boolean | null>(null);

  const { data, isLoading, error } = useQuery<Machine, Error>({
    queryKey: ["machine-detail", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<Machine>(`/machines/${slug}`);
      // Initialise wishlist state from API response
      setWishlisted(data.is_wishlisted ?? false);
      return data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (wishlisted) {
        await apiClient.delete(`/customer/wishlist/${data?.id}`);
      } else {
        await apiClient.post(`/customer/wishlist/${data?.id}`);
      }
    },
    onMutate: () => setWishlisted((prev) => !prev),
    onError: () => setWishlisted((prev) => !prev), // Rollback on error
  });

  if (isLoading) {
    return (
      <div className="section-container py-28 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        <p className="mt-4 text-sm">Loading machine details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="section-container py-28 text-center">
        <p className="text-lg font-semibold">Listing not found</p>
        <p className="text-muted-foreground mt-2">
          This machine may have been removed or is still under review.
        </p>
        <Link
          href="/machines"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground mt-6 hover:bg-primary/90 transition-colors"
        >
          <ArrowRight className="h-4 w-4" /> Browse equipment
        </Link>
      </div>
    );
  }

  const priceLabel = data.contact_for_price
    ? "Contact for price"
    : data.rental_price_daily
    ? `${formatINR(data.rental_price_daily)}/day`
    : data.purchase_price
    ? formatINR(data.purchase_price)
    : "Price on request";

  const enquireHref = user
    ? `/enquire/${data.id}?slug=${data.slug}`
    : `/login?redirectTo=/enquire/${data.id}`;

  // ── JSON-LD structured data ────────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title,
    description: data.description,
    image: data.images.map((img) => img.display_url),
    brand: { "@type": "Brand", name: data.make },
    model: data.model,
    productionDate: String(data.year_of_manufacture),
    offers: {
      "@type": "Offer",
      availability: data.availability
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: "INR",
      price: data.rental_price_daily ?? data.purchase_price ?? 0,
      seller: {
        "@type": "Organization",
        name: data.vendor?.company_name ?? data.vendor?.full_name ?? "InfraQuip Vendor",
      },
    },
  };

  return (
    <>
      {/* Structured data */}
      <Script
        id="product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="section-container py-8 pb-28 lg:pb-10">
        <div className="grid gap-8 xl:grid-cols-[1.7fr_0.9fr]">

          {/* ── Left column ─────────────────────────────────── */}
          <section className="space-y-6">

            {/* Photo carousel */}
            <PhotoCarousel images={data.images} title={data.title} />

            {/* Title + badges */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold">{data.title}</h1>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {data.city}, {data.state}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted px-3 py-1 text-xs font-medium">
                    {getListingTypeLabel(data.listing_type)}
                  </span>
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", getConditionColor(data.condition))}>
                    {data.condition.charAt(0).toUpperCase() + data.condition.slice(1)}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/80 bg-muted px-3 py-1 text-xs font-medium">
                    {data.year_of_manufacture}
                  </span>
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize", 
                    data.running_condition === "running" ? "text-emerald-500 border-emerald-200 bg-emerald-50/10" : "text-destructive border-destructive/30 bg-destructive/10"
                  )}>
                    {data.running_condition === "running" ? "Running" : "Not Running"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-600/10 text-blue-500 border border-blue-500/20 px-3 py-1 text-xs font-medium capitalize">
                    {data.ownership_type}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{data.views_count} views</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{data.enquiries_count} enquiries</span>
                {data.avg_rating && (
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{data.avg_rating.toFixed(1)} ({data.review_count})</span>
                )}
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Listed {formatDate(data.created_at)}</span>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">{data.description}</p>
            </div>

            {/* Specs grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">Capacity & Specs</h3>
                <p className="text-sm text-muted-foreground">{data.capacity_specs}</p>
              </div>
              {(data.hmr != null || (data.specifications && Object.keys(data.specifications).length > 0)) && (
                <div className="rounded-3xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-3">Technical Details</h3>
                  <ul className="space-y-2 text-sm">
                    {data.hmr != null && (
                      <li className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Hours Meter Reading (HMR)</span>
                        <span className="font-medium">{data.hmr} hrs</span>
                      </li>
                    )}
                    {data.specifications && Object.entries(data.specifications).map(([key, value]) => (
                      <li key={key} className="flex justify-between gap-4">
                        <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium">{String(value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Map */}
          {data.latitude && data.longitude && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Location</h2>
              <MapView
                latitude={data.latitude}
                longitude={data.longitude}
                title={data.title}
                city={data.city}
                state={data.state}
                className="h-64"
              />
            </div>
          )}
        </section>

        {/* ── Right column (sticky) ────────────────────────── */}
          <aside className="space-y-4">
            <div className="sticky top-24 space-y-4">

              {/* Pricing card */}
              <div className="rounded-3xl border border-border bg-card p-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Price</p>
                <p className="text-3xl font-bold text-primary mb-1">{priceLabel}</p>
                {data.rental_price_weekly && (
                  <p className="text-sm text-muted-foreground">{formatINR(data.rental_price_weekly)}/week</p>
                )}
                {data.rental_price_monthly && (
                  <p className="text-sm text-muted-foreground">{formatINR(data.rental_price_monthly)}/month</p>
                )}

                <div className="my-4 pt-4 border-t border-border space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Min rental</span>
                    <span className="font-medium">{data.min_rental_duration?.replace(/_/g, " ") ?? "1 day"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Availability</span>
                    <span className={cn("font-medium text-xs px-2 py-0.5 rounded-full", data.availability ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground")}>
                      {data.availability ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Button className="w-full btn-amber-glow gap-2" size="lg" asChild>
                    <Link href={enquireHref}>
                      <MessageSquare className="h-4 w-4" />
                      {user ? "Send Enquiry" : "Log in to Enquire"}
                    </Link>
                  </Button>
                  {user?.role === "customer" || user?.role === "broker" ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => wishlistMutation.mutate()}
                      disabled={wishlistMutation.isPending}
                    >
                      <Heart className={cn("h-4 w-4", wishlisted && "fill-rose-400 text-rose-400")} />
                      {wishlisted ? "Saved to Wishlist" : "Save to Wishlist"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Vendor card */}
              {data.vendor && (
                <div className="rounded-3xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">About the Vendor</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold">{data.vendor.company_name ?? data.vendor.full_name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {data.vendor.city}, {data.vendor.state}
                      </p>
                    </div>
                    {data.vendor.is_verified && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <BadgeCheck className="h-4 w-4" />
                        Verified by InfraQuip
                      </div>
                    )}
                    {data.vendor.response_rate != null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Response rate</span>
                        <span className="font-medium">{data.vendor.response_rate}%</span>
                      </div>
                    )}
                    {data.vendor.member_since && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Member since</span>
                        <span className="font-medium">{formatDate(data.vendor.member_since)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trust note */}
              <div className="rounded-3xl border border-border/50 bg-muted/30 p-5">
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Safe & Verified</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      All listings are reviewed by InfraQuip. Never pay before visiting the vendor and inspecting the machine.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Related Listings ─────────────────────────────── */}
        {data.category_id && (
          <RelatedListings
            currentSlug={data.slug}
            categoryId={data.category_id}
            city={data.city}
          />
        )}
      </div>

      {/* ── Sticky mobile CTA ───────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl p-4">
        <div className="flex items-center gap-3 max-w-screen-sm mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{data.title}</p>
            <p className="text-sm font-bold text-primary">{priceLabel}</p>
          </div>
          <Button className="btn-amber-glow gap-1.5 flex-shrink-0" asChild>
            <Link href={enquireHref}>
              <MessageSquare className="h-4 w-4" />
              Enquire
            </Link>
          </Button>
          {user?.role === "customer" || user?.role === "broker" ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => wishlistMutation.mutate()}
              disabled={wishlistMutation.isPending}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={cn("h-4 w-4", wishlisted && "fill-rose-400 text-rose-400")} />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
