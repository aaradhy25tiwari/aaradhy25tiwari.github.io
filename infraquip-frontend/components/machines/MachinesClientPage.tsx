"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronDown, LayoutGrid, List, Map, Loader2, Share2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatINR, getConditionColor, getListingTypeLabel } from "@/lib/utils";
import apiClient from "@/lib/api/client";
import type { MachineListItem, SearchFilters } from "@/types/machine";
import Link from "next/link";
import Image from "next/image";
import { MachineCard } from "./MachineCard";
import { MachineMapView } from "./MachineMapView";

// ── Types ─────────────────────────────────────────────────────
interface SearchResponse {
  results: MachineListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}


// ── Filter Sidebar ─────────────────────────────────────────────
function FilterSidebar({
  filters,
  onChange,
  onReset,
}: {
  filters: SearchFilters;
  onChange: (key: keyof SearchFilters, value: unknown) => void;
  onReset: () => void;
}) {
  const CONDITIONS = ["new", "excellent", "good", "fair"];
  const LISTING_TYPES = ["rent", "sale", "both"];
  const RUNNING_CONDITIONS = ["running", "not_running"];
  const OWNERSHIP_TYPES = ["owner", "dealer"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Filters</h2>
        <button onClick={onReset} className="text-xs text-primary hover:underline">
          Reset all
        </button>
      </div>

      {/* City */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">City</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="e.g. Pune"
            value={filters.city ?? ""}
            onChange={(e) => onChange("city", e.target.value || undefined)}
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Listing Type */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Listing Type</label>
        <div className="flex flex-wrap gap-2">
          {LISTING_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onChange("listing_type", filters.listing_type === type ? undefined : type)}
              className={cn(
                "filter-pill text-xs capitalize",
                filters.listing_type === type && "border-primary/50 bg-primary/10 text-primary"
              )}
            >
              {getListingTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Condition</label>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((cond) => (
            <button
              key={cond}
              onClick={() => {
                const current = filters.condition ?? [];
                const updated = current.includes(cond as never)
                  ? current.filter((c) => c !== cond)
                  : [...current, cond];
                onChange("condition", updated.length ? updated : undefined);
              }}
              className={cn(
                "filter-pill text-xs capitalize",
                filters.condition?.includes(cond as never) && "border-primary/50 bg-primary/10 text-primary"
              )}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {/* Running Condition */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Running Status</label>
        <div className="flex flex-wrap gap-2">
          {RUNNING_CONDITIONS.map((cond) => (
            <button
              key={cond}
              onClick={() => onChange("running_condition", filters.running_condition === cond ? undefined : cond)}
              className={cn(
                "filter-pill text-xs capitalize",
                filters.running_condition === cond && "border-primary/50 bg-primary/10 text-primary"
              )}
            >
              {cond.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Ownership */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Ownership Type</label>
        <div className="flex flex-wrap gap-2">
          {OWNERSHIP_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onChange("ownership_type", filters.ownership_type === type ? undefined : type)}
              className={cn(
                "filter-pill text-xs capitalize",
                filters.ownership_type === type && "border-primary/50 bg-primary/10 text-primary"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Max Daily Rate</label>
        <input
          type="number"
          placeholder="e.g. 5000"
          value={filters.max_price ?? ""}
          onChange={(e) => onChange("max_price", e.target.value ? Number(e.target.value) : undefined)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Available Only */}
      <div className="flex items-center gap-2">
        <input
          id="available-only"
          type="checkbox"
          checked={filters.available === true}
          onChange={(e) => onChange("available", e.target.checked ? true : undefined)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <label htmlFor="available-only" className="text-sm cursor-pointer">
          Available now only
        </label>
      </div>
    </div>
  );
}

// ── Main Client Page ───────────────────────────────────────────
export function MachinesClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Initialise filters from URL params ──────────────────────
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    listing_type: (searchParams.get("listing_type") ?? undefined) as SearchFilters["listing_type"],
    condition: searchParams.getAll("condition").length
      ? (searchParams.getAll("condition") as SearchFilters["condition"])
      : undefined,
    running_condition: (searchParams.get("running_condition") ?? undefined) as SearchFilters["running_condition"],
    ownership_type: (searchParams.get("ownership_type") ?? undefined) as SearchFilters["ownership_type"],
    max_price: searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined,
    available: searchParams.get("available") === "true" ? true : undefined,
    sort: (searchParams.get("sort") as SearchFilters["sort"]) ?? "newest",
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    per_page: 24,
  }));
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [copied, setCopied] = useState(false);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Sync filters → URL (for shareability) ────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.city) params.set("city", filters.city);
    if (filters.listing_type) params.set("listing_type", filters.listing_type);
    if (filters.condition?.length) filters.condition.forEach((c) => params.append("condition", c));
    if (filters.running_condition) params.set("running_condition", filters.running_condition);
    if (filters.ownership_type) params.set("ownership_type", filters.ownership_type);
    if (filters.max_price) params.set("max_price", String(filters.max_price));
    if (filters.available) params.set("available", "true");
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.page && filters.page > 1) params.set("page", String(filters.page));
    const qs = params.toString();
    router.replace(`/machines${qs ? `?${qs}` : ""}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const buildQuery = useCallback((f: SearchFilters) => {
    const params = new URLSearchParams();
    if (f.q) params.set("q", f.q);
    if (f.category) params.set("category", f.category);
    if (f.city) params.set("city", f.city);
    if (f.listing_type) params.set("listing_type", f.listing_type);
    if (f.condition?.length) f.condition.forEach((c) => params.append("condition", c));
    if (f.running_condition) params.set("running_condition", f.running_condition);
    if (f.ownership_type) params.set("ownership_type", f.ownership_type);
    if (f.max_price) params.set("max_price", String(f.max_price));
    if (f.available) params.set("available", "true");
    if (f.sort) params.set("sort", f.sort);
    params.set("page", String(f.page ?? 1));
    params.set("per_page", String(f.per_page ?? 24));
    return params.toString();
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["machines-search", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<SearchResponse>(`/search?${buildQuery(filters)}`);
      return data;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  const updateFilter = useCallback((key: keyof SearchFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ sort: "newest", page: 1, per_page: 24 });
    setSearchInput("");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("q", searchInput || undefined);
  };

  const activeFilterCount = [
    filters.city, filters.listing_type, filters.condition?.length,
    filters.running_condition, filters.ownership_type,
    filters.max_price, filters.available,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Search Header ─────────────────────────────────────── */}
      <div className="border-b border-border bg-card/80 backdrop-blur sticky top-16 z-30">
        <div className="section-container py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search machines, make, model..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <Button type="submit" size="sm" className="btn-amber-glow px-5">Search</Button>

            {/* Filter toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("gap-1.5 relative", activeFilterCount > 0 && "border-primary/50")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Share results link */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyShareLink}
              className="gap-1.5 hidden sm:flex"
              title="Copy shareable link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Copied!" : "Share"}
            </Button>

            {/* View mode */}
            <div className="hidden sm:flex items-center gap-1 border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn("p-2.5", viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn("p-2.5", viewMode === "list" ? "bg-muted" : "hover:bg-muted/50")}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={cn("p-2.5", viewMode === "map" ? "bg-muted" : "hover:bg-muted/50")}
              >
                <Map className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="section-container py-6">
        <div className="flex gap-6">
          {/* ── Desktop Filter Sidebar ───────────────────────── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-36 card-surface p-5">
              <FilterSidebar filters={filters} onChange={updateFilter} onReset={resetFilters} />
            </div>
          </aside>

          {/* ── Results ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Mobile filter drawer */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden card-surface p-5 mb-4 overflow-hidden"
                >
                  <FilterSidebar filters={filters} onChange={updateFilter} onReset={resetFilters} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Searching..."
                ) : (
                  <><span className="font-semibold text-foreground">{data?.total ?? 0}</span> listings found</>
                )}
              </p>

              {/* Sort */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="newest">Newest first</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="relevance">Most relevant</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Loading overlay */}
            {isFetching && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating results...
              </div>
            )}

            {/* Grid / Map */}
            {isLoading ? (
              <div className={viewMode === "grid" ? "grid-listings" : "space-y-4"}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="skeleton h-48 w-full" />
                    <div className="p-4 space-y-2">
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.results?.length ? (
              viewMode === "map" ? (
                <MachineMapView machines={data.results} className="h-[600px] shadow-sm" />
              ) : (
                <div className={viewMode === "grid" ? "grid-listings" : "space-y-4"}>
                  {data.results.map((machine, i) => (
                    <motion.div
                      key={machine.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <MachineCard machine={machine} />
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-24">
                <p className="text-muted-foreground text-lg mb-2">No listings match your search.</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Try removing some filters or searching a different location.
                </p>
                <Button variant="outline" onClick={resetFilters}>Clear all filters</Button>
              </div>
            )}

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline" size="sm"
                  disabled={filters.page === 1}
                  onClick={() => updateFilter("page", (filters.page ?? 1) - 1)}
                >Previous</Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {data.page} of {data.total_pages}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={filters.page === data.total_pages}
                  onClick={() => updateFilter("page", (filters.page ?? 1) + 1)}
                >Next</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
