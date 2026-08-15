"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Heart, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/customer", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/customer/wishlist", label: "Saved Listings", icon: Heart },
  { href: "/dashboard/customer/enquiries", label: "My Enquiries", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function CustomerDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customer</p>
        <h2 className="mt-1 text-lg font-semibold">Dashboard</h2>
      </div>
      {navItems.map((item) => {
        const isActive = item.href === "/dashboard/customer"
          ? pathname === "/dashboard/customer"
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
    </nav>
  );
}
