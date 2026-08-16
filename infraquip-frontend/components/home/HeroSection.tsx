"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const CATEGORIES = [
  "All Equipment",
  "Excavators",
  "Cranes",
  "Bulldozers",
  "Forklifts",
  "Loaders",
  "Compactors",
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
      className="relative flex items-center overflow-hidden min-h-[90svh] sm:min-h-[85vh] bg-slate-950"
      aria-label="Hero section"
    >
      {/* ── Background Image ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero_bg.jpg"
          alt="Heavy Construction Equipment at Sunset"
          fill
          priority
          className="object-cover object-center opacity-40 mix-blend-luminosity"
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/40 to-transparent" />
      </div>

      <div className="section-container relative z-10 w-full py-12 sm:py-20 mt-16 sm:mt-0">
        <div className="max-w-3xl">

          {/* ── Headline ──────────────────────────────────────── */}
          <h1 className="animate-slide-up delay-200 font-extrabold mb-4 sm:mb-6
                         text-5xl sm:text-6xl lg:text-7xl uppercase tracking-tight
                         text-white">
            BUILD <span className="text-amber-500">BIGGER.</span><br />
            BUILD <span className="text-amber-500">BETTER.</span>
          </h1>

          {/* ── Subheadline ───────────────────────────────────── */}
          <p className="animate-slide-up delay-300
                        text-slate-300 font-medium
                        text-base sm:text-xl mb-8 sm:mb-12 max-w-xl leading-relaxed">
            Rent or buy reliable heavy equipment for every project.
            Trusted brands, verified vendors, and transparent pricing.
          </p>

          {/* ── Search Widget ───────────────────────────────────── */}
          <div className="animate-slide-up delay-400">
            <div className="flex gap-2 mb-3">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-t-lg rounded-b-none border-0 px-6 h-10">
                RENT EQUIPMENT
              </Button>
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium rounded-t-lg rounded-b-none px-6 h-10">
                BUY EQUIPMENT
              </Button>
            </div>
            
            <form
              onSubmit={handleSearch}
              className="rounded-2xl rounded-tl-none p-3 shadow-2xl
                         bg-white border border-slate-200
                         dark:bg-slate-900/95 dark:border-white/10 dark:backdrop-blur-xl"
              role="search"
              aria-label="Equipment search"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                {/* Keyword input */}
                <div className="relative flex-[1.5]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search equipment (e.g. Excavator 20 Ton)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50
                               bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400
                               dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400 transition-all"
                    aria-label="Search query"
                  />
                </div>

                {/* Category select */}
                <div className="relative sm:w-56">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-xl px-4 py-3.5 text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50
                               bg-slate-50 border border-slate-200 text-slate-900
                               dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all font-medium"
                    aria-label="Equipment category"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                </div>

                {/* City input */}
                <div className="relative sm:w-48">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50
                               bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400
                               dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400 transition-all"
                    aria-label="City"
                  />
                </div>

                {/* Search Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-8 py-7 h-auto gap-2 font-bold text-base shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
                >
                  Search
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
