"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, MessageSquare, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/vendor", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/vendor/listings", label: "My Listings", icon: List },
  { href: "/dashboard/vendor/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function VendorDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vendor</p>
        <h2 className="mt-1 text-lg font-semibold">Dashboard</h2>
      </div>
      {navItems.map((item) => {
        const isActive = item.href === "/dashboard/vendor"
          ? pathname === "/dashboard/vendor"
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="pt-4">
        <Link
          href="/dashboard/vendor/listings/new"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Listing
        </Link>
      </div>
    </nav>
  );
}
