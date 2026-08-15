"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Calendar, Lock } from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api/client";
import { formatDate, cn } from "@/lib/utils";
import type { PublicLead } from "@/types/enquiry";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function LiveLeadsClient() {
  const { user } = useAuth();
  const isVendor = user?.role === "vendor";

  const { data: leads, isLoading, error } = useQuery<PublicLead[], Error>({
    queryKey: ["live-leads"],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicLead[]>("/live-leads");
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !leads) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Failed to load live leads. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead, index) => {
        // Blur leads after the first 3 for non-vendors
        const isBlurred = !isVendor && index >= 3;

        return (
          <div
            key={lead.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all",
              isBlurred ? "select-none" : "hover:border-primary/30"
            )}
          >
            <div className={cn(isBlurred && "blur-[6px] opacity-60 transition-all")}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold text-lg">
                    {lead.machine_category 
                      ? `${lead.machine_category} required` 
                      : lead.machine_title || "Equipment required"}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium text-foreground">{lead.customer_first_name}</span>
                    </span>
                    {lead.location_of_use && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {lead.location_of_use}
                      </span>
                    )}
                    {lead.required_from && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        From {formatDate(lead.required_from)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider", 
                    lead.requirement_type === "rent" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    For {lead.requirement_type}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Overlay for blurred rows */}
            {isBlurred && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/5 p-4">
                <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-lg text-center max-w-sm">
                  <Lock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium text-sm mb-3">Register as a Vendor to unlock this lead and contact the buyer.</p>
                  <Button className="w-full btn-amber-glow" size="sm" asChild>
                    <Link href="/request-access">Become a Vendor</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {leads.length === 0 && (
        <div className="py-12 text-center text-muted-foreground rounded-2xl border border-dashed border-border bg-card/50">
          No live leads found right now. Check back later!
        </div>
      )}
    </div>
  );
}
