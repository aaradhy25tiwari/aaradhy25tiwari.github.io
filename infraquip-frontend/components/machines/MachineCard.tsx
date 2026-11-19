"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, BadgeCheck, Clock, Settings2 } from "lucide-react";
import { type MachineListItem } from "@/types/machine";
import { cn } from "@/lib/utils";

interface MachineCardProps {
  machine: MachineListItem;
  className?: string;
  onToggleWishlist?: (id: string, isWishlisted: boolean) => void;
}

export function MachineCard({ machine, className, onToggleWishlist }: MachineCardProps) {
  const isRent = machine.listing_type === "rent" || machine.listing_type === "both";
  const isSale = machine.listing_type === "sale" || machine.listing_type === "both";

  const fallbackImage = "/placeholder-machine.webp"; // Create an asset if possible

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onToggleWishlist) {
      onToggleWishlist(machine.id, !!machine.is_wishlisted);
    }
  };

  const getPriceDisplay = () => {
    if (machine.contact_for_price) return "Price on Request";
    if (isRent) {
      if (machine.rental_price_daily) return `₹${machine.rental_price_daily.toLocaleString("en-IN")}/day`;
      if (machine.rental_price_hourly) return `₹${machine.rental_price_hourly.toLocaleString("en-IN")}/hr`;
      if (machine.rental_price_monthly) return `₹${machine.rental_price_monthly.toLocaleString("en-IN")}/mo`;
      if (machine.rental_price_weekly) return `₹${machine.rental_price_weekly.toLocaleString("en-IN")}/wk`;
    }
    if (isSale && machine.purchase_price) {
      return `₹${machine.purchase_price.toLocaleString("en-IN")}`;
    }
    return "Contact for Price";
  };

  return (
    <Link
      href={`/machines/${machine.slug}`}
      className={cn(
        "group flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors relative",
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden shrink-0">
        <Image
          src={machine.primary_image?.display_url || fallbackImage}
          alt={machine.title}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {machine.availability ? (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
              Available
            </span>
          ) : (
            <span className="bg-zinc-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
              Busy
            </span>
          )}
          {machine.is_rto_registered ? (
            <span className="bg-blue-600/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm">
              RTO Reg
            </span>
          ) : machine.is_rto_registered === false ? (
            <span className="bg-zinc-700/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm">
              Off-Road
            </span>
          ) : null}
          {machine.has_term_sheet && (
            <span className="bg-amber-600/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm">
              Term Sheet
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-md hover:bg-background rounded-full shadow-sm transition-all z-10"
          aria-label={machine.is_wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={cn("w-4 h-4 transition-colors", {
              "fill-red-500 text-red-500": machine.is_wishlisted,
              "text-muted-foreground": !machine.is_wishlisted,
            })}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Main Info */}
        <div className="flex-1">
          {/* Title & Location */}
          <div className="mb-2">
            <h3
              className="font-semibold text-card-foreground text-sm sm:text-[15px] leading-snug break-words group-hover:text-primary transition-colors min-h-[2.5rem]"
              title={machine.title}
            >
              {machine.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {machine.city}, {machine.state}
                {machine.distance_km && ` • ${Math.round(machine.distance_km)} km away`}
              </span>
            </div>
          </div>

          {/* Quick Specs */}
          <div className="flex items-center gap-x-3 gap-y-1.5 my-3 text-xs text-muted-foreground min-h-[24px] flex-wrap">
            <div className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span className="capitalize">{machine.condition}</span>
            </div>
            {machine.hmr && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{machine.hmr} hrs</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground px-1.5 py-0.5 bg-muted rounded text-[11px]">
                {machine.year_of_manufacture}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Price & Vendor */}
        <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-2 min-h-[52px]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              {isRent ? "Rental Rate" : "Asking Price"}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-lg text-primary leading-none">
                {getPriceDisplay()}
              </p>
              {machine.is_negotiable && !machine.contact_for_price && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                  Negotiable
                </span>
              )}
            </div>
          </div>
          {/* Vendor / Verified badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 shrink-0 max-w-[48%] min-w-0 text-xs font-medium",
              machine.vendor_is_verified ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"
            )}
            title={machine.vendor_name || (machine.vendor_is_verified ? "InfraQuip Verified Partner" : "InfraQuip Partner")}
          >
            <span className="truncate">
              {!machine.vendor_name || machine.vendor_name.toLowerCase().includes("infraquip")
                ? (machine.vendor_is_verified ? "InfraQuip Verified" : "InfraQuip Partner")
                : machine.vendor_name}
            </span>
            {machine.vendor_is_verified && (
              <BadgeCheck className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
