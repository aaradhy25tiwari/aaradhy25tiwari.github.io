"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, PlusCircle, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function StickyMobileCta() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide sticky CTA on dashboard or auth pages to prevent clutter
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return null;
  }

  const isVendor = user?.role === "vendor";

  return (
    <aside
      aria-label="Mobile quick actions"
      className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:hidden bg-background/85 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Browse Machinery CTA */}
        <Link
          href="/machines"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-colors border border-border"
        >
          <Search className="h-4 w-4 text-primary" />
          <span>Find Equipment</span>
        </Link>

        {/* Primary CTA (List Equipment / Add Machine) */}
        <Link
          href={isVendor ? "/dashboard/vendor/add-machine" : "/register?role=vendor"}
          className="flex-[1.2] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{isVendor ? "Add Machine" : "List Machine"}</span>
        </Link>

        {/* Quick Phone Connect */}
        <a
          href="tel:+919876543210"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/90 border border-border text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
          aria-label="Call InfraQuip Helpline"
        >
          <Phone className="h-4 w-4" />
        </a>
      </div>
    </aside>
  );
}
