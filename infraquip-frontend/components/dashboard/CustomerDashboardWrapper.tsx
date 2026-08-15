"use client";

import { LayoutDashboard, Heart, MessageSquare, Settings } from "lucide-react";
import { DashboardShell } from "./DashboardShell";

const navItems = [
  { href: "/dashboard/customer",           label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/customer/wishlist",  label: "Saved",         icon: Heart },
  { href: "/dashboard/customer/enquiries", label: "Enquiries",     icon: MessageSquare },
  { href: "/dashboard/settings",           label: "Settings",      icon: Settings },
];

export function CustomerDashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell navItems={navItems} role="Customer">
      {children}
    </DashboardShell>
  );
}
