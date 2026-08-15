"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Users, Building2, MessageSquare, Star,
  Shield, Bell, TrendingUp, ChevronLeft, UserCheck, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

const navItems = [
  { label: "Overview",          href: "/admin",                  icon: LayoutDashboard },
  { label: "Account Requests",  href: "/admin/requests",         icon: UserCheck, badgeKey: "requests" },
  { label: "Machines",          href: "/admin/machines",         icon: Package },
  { label: "Users",             href: "/admin/users",            icon: Users },
  { label: "Vendors",           href: "/admin/vendors",          icon: Building2 },
  { label: "Enquiries",         href: "/admin/enquiries",        icon: MessageSquare },
  { label: "Reviews",           href: "/admin/reviews",          icon: Star },
  { label: "Disputes",          href: "/admin/disputes",         icon: Shield },
  { label: "Analytics",         href: "/admin/analytics",        icon: TrendingUp },
  { label: "Notifications",     href: "/admin/notifications",    icon: Bell },
];

// Items shown in the mobile bottom bar (max 5)
const mobileTabItems = [
  navItems[0], // Overview
  navItems[1], // Account Requests
  navItems[2], // Machines
  navItems[5], // Enquiries
  navItems[8], // Analytics
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileDrawerOpen(false); }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileDrawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawerOpen]);

  // Pending request count for badge
  const { data: reqStats } = useQuery<{ pending: number }>({
    queryKey: ["account-request-stats"],
    queryFn: () => apiClient.get("/account-requests/admin/stats").then(r => r.data),
    refetchInterval: 60_000,
    enabled: mounted,
  });
  const pendingCount = reqStats?.pending ?? 0;

  if (!mounted) return <div className="p-6 lg:p-8">{children}</div>;

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(href));

  const getBadge = (item: typeof navItems[0]) => {
    if ((item as typeof navItems[0] & { badgeKey?: string }).badgeKey === "requests") return pendingCount;
    return 0;
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className={cn(
        "hidden lg:flex flex-col sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0 border-r border-border bg-card transition-all duration-200 overflow-y-auto",
        collapsed ? "w-16" : "w-64",
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center border-b border-border p-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
        </button>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const badge = getBadge(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {badge > 0 && !collapsed && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {badge}
                  </span>
                )}
                {badge > 0 && collapsed && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-16 z-20 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none">Admin</p>
            <p className="text-sm font-semibold mt-0.5">Dashboard</p>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </div>

        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile slide-in drawer ────────────────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-card border-r border-border lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Admin</p>
                  <h2 className="text-base font-bold mt-0.5">Dashboard</h2>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  const badge = getBadge(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom tab bar ─────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="flex items-stretch">
          {mobileTabItems.map((item) => {
            const active = isActive(item.href);
            const badge = getBadge(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="admin-tab-indicator"
                    className="absolute top-0 inset-x-1/4 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  />
                )}
                <item.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span className="truncate max-w-[56px]">{item.label.split(" ")[0]}</span>
                {badge > 0 && (
                  <span className="absolute right-1 top-1.5 h-4 min-w-4 rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground leading-4 text-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
