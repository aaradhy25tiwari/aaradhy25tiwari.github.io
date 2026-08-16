"use client";

import { LayoutDashboard, Heart, MessageSquare, User } from "lucide-react";
import { DashboardShell } from "./DashboardShell";

const navItems = [
  { href: "/dashboard/broker",           label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/broker/wishlist",  label: "Saved",         icon: Heart },
  { href: "/dashboard/broker/enquiries", label: "Enquiries",     icon: MessageSquare },
  { href: "/dashboard/broker/profile",   label: "Profile",       icon: User },
];

export function BrokerDashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell navItems={navItems} role="Broker">
      {children}
    </DashboardShell>
  );
}
