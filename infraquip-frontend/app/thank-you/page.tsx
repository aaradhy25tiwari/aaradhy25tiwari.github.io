import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, Mail, Clock, ArrowRight, Home, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Thank You — Request Received | InfraQuip",
  description:
    "Thank you for contacting InfraQuip. Your equipment enquiry or application has been successfully submitted.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <div className="section-container min-h-[calc(100vh-10rem)] py-16 flex items-center justify-center">
      <div className="w-full max-w-2xl text-center">
        {/* Animated Check Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-6 animate-pulse">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        {/* Heading */}
        <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
          Submission Successful
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Thank You! We&apos;ve Received Your Request
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-lg mx-auto">
          Your details have been routed directly to our operations team and the designated equipment coordinators.
        </p>

        {/* Timeline / Next Steps Card */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 text-left shadow-sm space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            What happens next?
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs mt-0.5">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground">Verification & Routing</p>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Our algorithm and team verify machine availability, pricing tier, and vendor credentials.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs mt-0.5">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground">Direct Notification & Contact</p>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  You will receive an SMS/WhatsApp and email confirmation with quote details and contact instructions within 2 to 4 business hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs mt-0.5">
                3
              </div>
              <div>
                <p className="font-semibold text-foreground">Secure Deal Execution</p>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Connect directly with the verified partner for dispatch, site mobilization, and billing.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>100% Verified Partners & Secure Data</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="tel:+919876543210" className="flex items-center gap-1 hover:text-foreground">
                <Phone className="h-3.5 w-3.5 text-primary" /> +91-9876543210
              </a>
              <a href="mailto:support@infraquip.com" className="flex items-center gap-1 hover:text-foreground">
                <Mail className="h-3.5 w-3.5 text-primary" /> support@infraquip.com
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20">
            <Link href="/machines">
              Browse More Equipment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-xl gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
