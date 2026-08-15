"use client";

/**
 * DashboardShell — Responsive dashboard wrapper
 * Mobile (<lg): bottom tab bar + content takes full width
 * Desktop (>=lg): sticky left sidebar + content
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: DashboardNavItem[];
  role: string;           // "Vendor" | "Customer" | "Admin"
  /** Extra actions rendered below the nav (e.g. "Add Listing" CTA) */
  extraAction?: React.ReactNode;
}

export function DashboardShell({
  children,
  navItems,
  role,
  extraAction,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const isActive = (item: DashboardNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  // ── Bottom tab items (max 5 shown, rest in "More" drawer) ──
  const tabItems = navItems.slice(0, 5);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-border bg-card overflow-y-auto">
        <div className="p-5 pb-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">
            {role}
          </p>
          <h2 className="text-base font-bold">Dashboard</h2>
        </div>
        <nav className="flex-1 px-3 pb-4 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110", active && "text-primary")} />
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {extraAction && (
          <div className="p-3 border-t border-border">{extraAction}</div>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-16 z-20 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-none">
              {role}
            </p>
            <p className="text-sm font-semibold mt-0.5">Dashboard</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </div>

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </div>

      {/* ── Mobile slide-in drawer ────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-card border-r border-border lg:hidden overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {role}
                  </p>
                  <h2 className="text-base font-bold mt-0.5">Dashboard</h2>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0", active && "text-primary")} />
                      <span className="flex-1">{item.label}</span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {extraAction && (
                <div className="p-4 border-t border-border">
                  {extraAction}
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom tab bar ─────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-border bg-card/95 backdrop-blur-xl"
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch">
          {tabItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute top-0 inset-x-1/4 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  />
                )}
                <item.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span className="truncate max-w-[56px]">{item.label.split(" ")[0]}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute right-2 top-1.5 h-4 min-w-4 rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground leading-4 text-center">
                    {item.badge > 99 ? "99+" : item.badge}
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
