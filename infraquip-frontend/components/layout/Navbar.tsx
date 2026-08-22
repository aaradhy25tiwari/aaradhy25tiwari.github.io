"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/machines", label: "Browse Equipment" },
  { href: "/machines/excavators", label: "Excavators" },
  { href: "/machines/cranes", label: "Cranes" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const dashboardHref =
    user?.role === "admin" ? "/admin"
    : user?.role === "vendor" ? "/dashboard/vendor"
    : user?.role === "broker" ? "/dashboard/broker"
    : "/dashboard/customer";

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "border-b border-border/60 bg-background/95 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        )}
      >
        <nav
          className="section-container flex h-16 items-center justify-between"
          aria-label="Main navigation"
        >
          {/* ── Logo ──────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-xl"
            aria-label="InfraQuip — Home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-gradient-amber hidden sm:block">InfraQuip</span>
          </Link>

          {/* ── Desktop Nav Links ─────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.filter((link) => {
              if (user?.role === "vendor" && link.href.startsWith("/machines")) {
                return false;
              }
              return true;
            }).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Desktop Right Controls ───────────────────────── */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />

            {!loading && (
              <>
                {user ? (
                  <>
                    {/* Notification Bell */}
                    <NotificationBell />

                    {/* Add Listing (Vendor only) */}
                    {user.role === "vendor" && (
                      <Button
                        size="sm"
                        className="btn-amber-glow gap-1.5"
                        asChild
                      >
                        <Link href="/dashboard/vendor/listings/new">
                          <Plus className="h-4 w-4" />
                          Add Machine
                        </Link>
                      </Button>
                    )}

                    {/* User Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 px-2"
                          aria-label="User menu"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.avatar_url ?? undefined}
                              alt={user.full_name}
                            />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-semibold leading-none">
                              {user.full_name}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={dashboardHref} className="gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`${dashboardHref}/profile`}
                            className="gap-2"
                          >
                            <User className="h-4 w-4" />
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => signOut()}
                          className="text-destructive gap-2 cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button size="sm" className="btn-amber-glow" asChild>
                      <Link href="/register">Get Started</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Mobile Controls ───────────────────────────────── */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2">
            {!loading && !user && (
              <Button variant="ghost" size="sm" asChild className="px-2 font-medium">
                <Link href="/login">Log in</Link>
              </Button>
            )}
            {user?.role !== "vendor" && (
              <Button variant="ghost" size="icon" asChild aria-label="Search">
                <Link href="/machines">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Menu ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 lg:hidden border-b border-border bg-background/98 backdrop-blur-xl"
          >
            <div className="section-container py-4 space-y-1">
              {NAV_LINKS.filter((link) => {
                if (user?.role === "vendor" && link.href.startsWith("/machines")) {
                  return false;
                }
                return true;
              }).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "text-primary bg-primary/10"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-3 border-t border-border space-y-2">
                {!loading && (
                  user ? (
                    <>
                      <Link
                        href={dashboardHref}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-muted"
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                      {user.role === "vendor" && (
                        <Link
                          href="/dashboard/vendor/listings/new"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10"
                        >
                          <Plus className="h-4 w-4" />
                          Add Machine
                        </Link>
                      )}
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button className="w-full btn-amber-glow" asChild>
                        <Link href="/register">Get Started</Link>
                      </Button>
                    </div>
                  )
                )}
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 z-30 lg:hidden bg-black/20"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
