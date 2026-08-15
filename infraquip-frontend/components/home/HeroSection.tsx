"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronDown, ArrowRight, Shield, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "All Equipment",
  "Excavators",
  "Cranes",
  "Bulldozers",
  "Forklifts",
  "Loaders",
  "Compactors",
];

const TRUST_BADGES = [
  { icon: Shield, label: "Verified Vendors" },
  { icon: Star, label: "Rated & Reviewed" },
  { icon: Zap, label: "Fast Response" },
];

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("All Equipment");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    if (category !== "All Equipment") params.set("category", category.toLowerCase());
    router.push(`/machines?${params.toString()}`);
  };

  return (
    <section
      className="relative flex items-center overflow-hidden min-h-[100svh] sm:min-h-[85vh]
                 bg-gradient-to-br from-slate-50 via-white to-amber-50/40
                 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      aria-label="Hero section"
    >
      {/* ── Background Pattern ─────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(35 95% 52%) 1px, transparent 1px), linear-gradient(90deg, hsl(35 95% 52%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute -top-40 -right-40 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full bg-amber-400/10 dark:bg-amber-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-orange-300/10 dark:bg-orange-500/6 blur-[120px] pointer-events-none" />

      <div className="section-container relative z-10 w-full py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">

          {/* ── Badge ─────────────────────────────────────────── */}
          <div className="animate-slide-up delay-100 inline-flex items-center gap-2 rounded-full
                          border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10
                          px-3 py-1 sm:px-4 sm:py-1.5 mb-5 sm:mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
              India&apos;s #1 Construction Equipment Marketplace
            </span>
          </div>

          {/* ── Headline ──────────────────────────────────────── */}
          <h1 className="animate-slide-up delay-200 font-extrabold mb-4 sm:mb-6
                         text-[1.75rem] leading-tight sm:text-5xl lg:text-6xl
                         text-slate-900 dark:text-white">
            Find the Right{" "}
            <span className="text-gradient-amber">Heavy Machinery</span>
            {" "}for Your Next Project
          </h1>

          {/* ── Subheadline ───────────────────────────────────── */}
          <p className="animate-slide-up delay-300
                        text-slate-600 dark:text-slate-300
                        text-base sm:text-xl mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Browse verified excavators, cranes, bulldozers, and more from trusted
            vendors near you. Compare prices. Enquire instantly.
          </p>

          {/* ── Search Form ───────────────────────────────────── */}
          <form
            onSubmit={handleSearch}
            className="animate-slide-up delay-300
                       rounded-2xl p-2 mb-6 sm:mb-8 shadow-md
                       bg-white border border-slate-200
                       dark:bg-slate-900/80 dark:border-white/8 dark:backdrop-blur-xl"
            role="search"
            aria-label="Equipment search"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Category select */}
              <div className="relative sm:w-44">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl px-4 py-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50
                             bg-slate-50 border border-slate-200 text-slate-900
                             dark:bg-white/5 dark:border-white/10 dark:text-white"
                  aria-label="Equipment category"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {/* City input */}
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="City (e.g. Pune, Mumbai)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50
                             bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400
                             dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
                  aria-label="City"
                />
              </div>

              {/* Keyword input */}
              <div className="relative flex-[1.4]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Machine, brand, model..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50
                             bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400
                             dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
                  aria-label="Search query"
                />
              </div>

              {/* Search Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto rounded-xl btn-amber-glow gap-2 font-semibold"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </form>

          {/* ── Trust Badges ────────────────────────────────────── */}
          <div className="animate-slide-up delay-400 flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8
                          text-slate-500 dark:text-slate-400">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* ── CTA Links ───────────────────────────────────────── */}
          <div className="animate-slide-up delay-500 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto gap-2
                         border-slate-300 text-slate-700 hover:bg-slate-100
                         dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              asChild
            >
              <a href="/register?role=vendor">
                List Your Machine Free
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <a
              href="/machines"
              className="text-sm flex items-center gap-1 transition-colors
                         text-slate-500 hover:text-slate-900
                         dark:text-slate-400 dark:hover:text-white"
            >
              Browse all equipment
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Bottom Fade ─────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-24 pointer-events-none
                      bg-gradient-to-t from-slate-50 to-transparent
                      dark:from-slate-950" />
    </section>
  );
}
