"use client";

import Link from "next/link";
import { ArrowRight, BellRing, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOCK_LEADS = [
  { id: 1, equipment: "Excavator 20 Ton", city: "Pune", time: "2 mins ago", requirement: "1 month rent" },
  { id: 2, equipment: "Backhoe Loader", city: "Mumbai", time: "15 mins ago", requirement: "Purchase, Used" },
  { id: 3, equipment: "Crane 50 Ton", city: "Nagpur", time: "1 hour ago", requirement: "Weekly rent" },
];

export function LiveLeadsPreview() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
      <div className="section-container relative z-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              Live Leads
            </h2>
            <p className="text-muted-foreground mt-2">
              Real-time equipment requirements from verified customers.
            </p>
          </div>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href="/register?role=vendor">
              Become a Vendor to Reply <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:grid">
            <div className="col-span-4">Equipment Needed</div>
            <div className="col-span-3">Location</div>
            <div className="col-span-3">Requirement</div>
            <div className="col-span-2 text-right">Time</div>
          </div>

          {/* Unlocked Rows */}
          <div className="divide-y divide-border relative">
            {MOCK_LEADS.slice(0, 2).map((lead) => (
              <div key={lead.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                <div className="col-span-1 sm:col-span-4 font-medium text-primary">
                  {lead.equipment}
                </div>
                <div className="col-span-1 sm:col-span-3 text-sm text-foreground">
                  {lead.city}
                </div>
                <div className="col-span-1 sm:col-span-3 text-sm text-foreground">
                  {lead.requirement}
                </div>
                <div className="col-span-1 sm:col-span-2 text-xs text-muted-foreground sm:text-right">
                  {lead.time}
                </div>
              </div>
            ))}

            {/* Blurred Rows for Guests */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/50 to-transparent z-10 flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-card border border-border px-6 py-5 rounded-xl shadow-2xl text-center max-w-sm mx-auto relative z-20">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full p-2 shadow-sm">
                    <LockKeyhole className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 mt-2">Unlock 50+ Daily Leads</h3>
                  <p className="text-xs text-muted-foreground mb-5">
                    Register as a vendor to see all requirements and contact customers instantly.
                  </p>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" asChild>
                    <Link href="/register?role=vendor">Join as Vendor</Link>
                  </Button>
                </div>
              </div>

              {/* Fake blurred rows */}
              {MOCK_LEADS.slice(2, 3).map((lead) => (
                <div key={lead.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-4 items-center opacity-30 blur-[4px] select-none pointer-events-none">
                  <div className="col-span-1 sm:col-span-4 font-medium">{lead.equipment}</div>
                  <div className="col-span-1 sm:col-span-3 text-sm">{lead.city}</div>
                  <div className="col-span-1 sm:col-span-3 text-sm">{lead.requirement}</div>
                  <div className="col-span-1 sm:col-span-2 text-xs sm:text-right">{lead.time}</div>
                </div>
              ))}
              
              {/* Additional generic blurred row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-4 items-center opacity-20 blur-[5px] select-none pointer-events-none">
                <div className="col-span-1 sm:col-span-4 h-5 bg-muted-foreground/30 rounded w-3/4"></div>
                <div className="col-span-1 sm:col-span-3 h-5 bg-muted-foreground/30 rounded w-1/2"></div>
                <div className="col-span-1 sm:col-span-3 h-5 bg-muted-foreground/30 rounded w-2/3"></div>
                <div className="col-span-1 sm:col-span-2 h-5 bg-muted-foreground/30 rounded w-1/3 ml-auto"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center md:hidden">
          <Button variant="outline" asChild className="w-full">
            <Link href="/register?role=vendor">
              Become a Vendor to Reply <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
