import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wrench, Search, ArrowRight, Home, HelpCircle } from "lucide-react";

export const metadata = {
  title: "404 — Page Not Found | InfraQuip",
  description: "The page you are looking for does not exist or has been moved.",
  robots: { index: false, follow: false },
};

const POPULAR_CATEGORIES = [
  { name: "Excavators", href: "/machines?category=excavators" },
  { name: "Cranes", href: "/machines?category=cranes" },
  { name: "Bulldozers", href: "/machines?category=bulldozers" },
  { name: "Loaders", href: "/machines?category=loaders" },
  { name: "Forklifts", href: "/machines?category=forklifts" },
];

export default function NotFound() {
  return (
    <div className="section-container min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center py-16 text-center">
      {/* 404 Badge */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 mx-auto text-amber-500">
          <Wrench className="h-10 w-10 animate-bounce" />
        </div>
        <span className="absolute -bottom-2 -right-2 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-slate-950 shadow-md">
          404
        </span>
      </div>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground max-w-lg">
        Equipment Missing from Site
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        The page or equipment listing you are looking for has been relocated, unlisted, or does not exist.
      </p>

      {/* Primary Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20">
          <Link href="/">
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-xl gap-2">
          <Link href="/machines">
            <Search className="h-4 w-4" />
            Browse All Machines
          </Link>
        </Button>
      </div>

      {/* Popular Categories Shortcut */}
      <div className="mt-12 w-full max-w-lg rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
          Looking for construction machinery?
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {POPULAR_CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-xs font-medium text-foreground transition-colors"
            >
              {cat.name}
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Help Link */}
      <p className="mt-8 text-xs text-muted-foreground flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        Need immediate help finding machinery?{" "}
        <Link href="/contact" className="text-primary hover:underline font-medium">
          Contact our support team
        </Link>
      </p>
    </div>
  );
}
