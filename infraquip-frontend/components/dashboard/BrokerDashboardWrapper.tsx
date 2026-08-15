"use client";

import { LayoutDashboard, Heart, MessageSquare, Settings } from "lucide-react";
import { DashboardShell } from "./DashboardShell";

const navItems = [
  { href: "/dashboard/broker",           label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/broker/wishlist",  label: "Saved",         icon: Heart },
  { href: "/dashboard/broker/enquiries", label: "Enquiries",     icon: MessageSquare },
  { href: "/dashboard/settings",         label: "Settings",      icon: Settings },
];

export function BrokerDashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell navItems={navItems} role="Broker">
      {children}
    </DashboardShell>
  );
}
