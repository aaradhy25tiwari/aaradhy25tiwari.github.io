"use client";

import Link from "next/link";
import { LayoutDashboard, List, MessageSquare, User, Plus, CreditCard } from "lucide-react";
import { DashboardShell } from "./DashboardShell";

const navItems = [
  { href: "/dashboard/vendor",           label: "Overview",   icon: LayoutDashboard, exact: true },
  { href: "/dashboard/vendor/listings",  label: "My Listings", icon: List },
  { href: "/dashboard/vendor/enquiries", label: "Enquiries",  icon: MessageSquare },
  { href: "/dashboard/vendor/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/vendor/profile",          label: "Profile",    icon: User },
];

export function VendorDashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navItems={navItems}
      role="Vendor"
      extraAction={
        <Link
          href="/dashboard/vendor/listings/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 w-full"
        >
          <Plus className="h-4 w-4" />
          Add Listing
        </Link>
      }
    >
      {children}
    </DashboardShell>
  );
}
