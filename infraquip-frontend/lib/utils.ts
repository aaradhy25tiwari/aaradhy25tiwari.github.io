import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency formatting ───────────────────────────────────────
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Date formatting ───────────────────────────────────────────
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const target = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (!(target instanceof Date) || isNaN(target.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - target.getTime();

  if (diffMs < 0) {
    const futureDays = Math.floor(-diffMs / 86400000);
    if (futureDays === 0) return "today";
    if (futureDays === 1) return "tomorrow";
    if (futureDays < 7) return `in ${futureDays}d`;
    return formatDate(target);
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(target);
}

// ── Category Sorting ──────────────────────────────────────────
/**
 * Sorts category items or strings alphabetically ascending (A to Z),
 * ensuring 'Other' / 'Others' is always placed as the very last option.
 */
export function sortCategoriesAlphabetical<T extends { name: string } | string>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const nameA = typeof a === "string" ? a : a.name;
    const nameB = typeof b === "string" ? b : b.name;
    const isOtherA = nameA.toLowerCase().trim().startsWith("other");
    const isOtherB = nameB.toLowerCase().trim().startsWith("other");
    if (isOtherA && !isOtherB) return 1;
    if (!isOtherA && isOtherB) return -1;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Truncate text ─────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

// ── Condition badge color ─────────────────────────────────────
export function getConditionColor(condition: string): string {
  const map: Record<string, string> = {
    new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    excellent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    good: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    fair: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  return map[condition] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

// ── Listing type label ────────────────────────────────────────
export function getListingTypeLabel(type: string): string {
  const map: Record<string, string> = {
    rent: "For Rent",
    sale: "For Sale",
    both: "Rent & Sale",
  };
  return map[type] ?? type;
}

// ── File size formatter ───────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Smooth Scroll to Top ──────────────────────────────────────
export function scrollToTop(behavior: ScrollBehavior = "smooth") {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, left: 0, behavior });
  }
}

