"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { 
  Loader2, Building2, CheckCircle2, XCircle, Search, 
  ChevronRight, MapPin, Package, Phone, Mail, Ban, ShieldCheck, ShieldAlert 
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn, scrollToTop } from "@/lib/utils";

interface VendorListItem {
  id: string;
  email: string;
  phone?: string | null;
  full_name: string;
  business_name?: string | null;
  city?: string | null;
  state?: string | null;
  machines_count?: number;
  is_verified: boolean;
  is_banned: boolean;
  failed_login_attempts?: number;
  reactivation_requested?: boolean;
  created_at: string;
}

interface PaginatedVendorsResponse {
  results: VendorListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

type FilterStatus = "all" | "verified" | "unverified" | "banned";

function getPaginationItems(currentPage: number, totalPages: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis-start" | "ellipsis-end")[] = [1];
  const start = Math.max(2, Math.min(currentPage - 1, totalPages - 3));
  const end = Math.min(totalPages - 1, Math.max(currentPage + 1, 4));

  if (start > 2) {
    items.push("ellipsis-start");
  }

  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);
  return items;
}

export default function AdminVendorsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const lastDebouncedRef = useRef(debouncedSearch);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (lastDebouncedRef.current !== search) {
        lastDebouncedRef.current = search;
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery<PaginatedVendorsResponse>({
    queryKey: ["admin-vendors", debouncedSearch, filter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (filter !== "all") params.set("status", filter);
      const { data } = await apiClient.get<PaginatedVendorsResponse>(`/admin/vendors?${params.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const vendors = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary flex items-center gap-1.5">
              {(isPlaceholderData || (isFetching && !isLoading)) && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
              {data?.total ?? vendors.length} total
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage vendor accounts, verify business credentials, and review machinery fleets.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            suppressHydrationWarning
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            placeholder="Search vendors by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-xs outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "all", label: "All Vendors" },
          { id: "verified", label: "Verified" },
          { id: "unverified", label: "Unverified" },
          { id: "banned", label: "Banned" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id as FilterStatus);
              setPage(1);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              filter === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading vendor accounts...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-14 text-center bg-card/40">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-4 text-base font-semibold">No vendors found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {(debouncedSearch.trim() || search.trim())
              ? `No vendors match "${search.trim() || debouncedSearch.trim()}". Try adjusting your search query.`
              : filter !== "all"
              ? data && data.total_pages > 1
                ? `No ${filter} vendor accounts found on page ${page}. Try checking other pages below.`
                : "No vendor accounts match the filter."
              : "No vendor accounts found."}
          </p>
        </div>
      ) : (
        <div className={cn("grid gap-3 transition-opacity duration-150", (isPlaceholderData || (isFetching && !isLoading)) && "opacity-50 pointer-events-none")}>
          {vendors.map((v) => (
            <Link
              key={v.id}
              href={`/admin/vendors/${v.id}`}
              className="group block rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all duration-200 hover:border-primary/50 hover:bg-muted/30 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Avatar + Vendor Info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-base uppercase">
                    {(v.business_name || v.full_name || "V").charAt(0)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {v.business_name || v.full_name}
                      </p>
                      {v.business_name && v.full_name && v.business_name !== v.full_name && (
                        <span className="text-xs text-muted-foreground">
                          ({v.full_name})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground/70" />
                        <span className="truncate">{v.email}</span>
                      </span>

                      {v.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground/70" />
                          <span>{v.phone}</span>
                        </span>
                      )}

                      {(v.city || v.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground/70" />
                          <span>{[v.city, v.state].filter(Boolean).join(", ")}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Badges, Count & Action Affordance */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                  {/* Fleet Count */}
                  <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{v.machines_count ?? 0} machines</span>
                  </span>

                  {/* Verification Status */}
                  {v.is_banned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                      <Ban className="h-3 w-3" />
                      Banned
                    </span>
                  ) : v.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                      <ShieldAlert className="h-3 w-3" />
                      Unverified
                    </span>
                  )}

                  {/* Joined Date */}
                  <span className="text-xs text-muted-foreground hidden md:inline-block">
                    {formatRelativeTime(v.created_at)}
                  </span>

                  {/* Chevron Right */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.total_pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Page {data.page} of {data.total_pages} ({data.total} total vendors)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setPage((prev) => Math.max(1, prev - 1));
                scrollToTop();
              }}
              disabled={page <= 1}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            {getPaginationItems(data.page, data.total_pages).map((item) =>
              typeof item === "number" ? (
                <button
                  key={item}
                  onClick={() => {
                    setPage(item);
                    scrollToTop();
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer",
                    page === item
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {item}
                </button>
              ) : (
                <span
                  key={item}
                  className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              )
            )}
            <button
              onClick={() => {
                setPage((prev) => Math.min(data.total_pages, prev + 1));
                scrollToTop();
              }}
              disabled={page >= data.total_pages}
              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
