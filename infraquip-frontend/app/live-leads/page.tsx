import type { Metadata } from "next";
import { LiveLeadsClient } from "@/components/public/LiveLeadsClient";
import { Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Leads | InfraQuip",
  description: "Real-time construction equipment rental and purchase requirements.",
};

export default function LiveLeadsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="section-container py-12 lg:py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-2">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Live Equipment Leads</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real-time requirements from verified contractors across India. Register as a vendor to unlock contact details and submit quotes instantly.
            </p>
          </div>

          <LiveLeadsClient />
          
        </div>
      </div>
    </div>
  );
}
