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
    if (isRent && machine.rental_price_daily) {
      return `₹${machine.rental_price_daily.toLocaleString("en-IN")}/day`;
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
        "group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors relative",
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
        <Image
          src={machine.primary_image?.display_url || fallbackImage}
          alt={machine.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {machine.availability ? (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase shadow-sm">
              Available
            </span>
          ) : (
            <span className="bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase shadow-sm">
              Busy
            </span>
          )}
          
          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase shadow-sm">
            {machine.listing_type === "both" ? "Rent / Sale" : machine.listing_type}
          </span>
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
        {/* Title & Location */}
        <div className="mb-2">
          <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {machine.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">
              {machine.city}, {machine.state}
              {machine.distance_km && ` • ${Math.round(machine.distance_km)} km away`}
            </span>
          </div>
        </div>

        {/* Quick Specs */}
        <div className="flex flex-wrap gap-y-2 gap-x-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            <span className="capitalize">{machine.condition}</span>
          </div>
          {machine.hmr && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{machine.hmr} hrs</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground px-1.5 py-0.5 bg-muted rounded">
              {machine.year_of_manufacture}
            </span>
          </div>
        </div>

        {/* Footer: Price & Vendor */}
        <div className="mt-auto pt-3 border-t border-border flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              {isRent ? "Rental Rate" : "Asking Price"}
            </p>
            <p className="font-bold text-lg text-primary leading-none">
              {getPriceDisplay()}
            </p>
          </div>
          <div className="flex items-center gap-1.5 max-w-[50%]">
            <div className="truncate text-right">
              <p className="text-xs font-medium text-foreground truncate">
                {machine.vendor_name}
              </p>
            </div>
            {machine.vendor_is_verified && (
              <BadgeCheck className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
