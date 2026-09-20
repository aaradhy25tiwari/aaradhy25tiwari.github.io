import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, HelpCircle, ArrowRight, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Subscription Pricing & Plans — InfraQuip",
  description:
    "Predictable, transparent subscription pricing for equipment vendors and contractors. No hidden commissions, no surprise platform markups.",
  openGraph: {
    title: "InfraQuip Pricing — Transparent Plans for Heavy Machinery",
    description: "Compare free and pro plans for fleet owners and construction companies. 100% transparent pricing with 7-day money-back guarantee.",
  },
};

const PLANS = [
  {
    name: "Vendor Starter",
    badge: "Free Forever",
    price: "₹0",
    period: "forever",
    description: "Perfect for independent fleet owners looking to list introductory machinery.",
    features: [
      "Up to 5 active machine listings",
      "5 high-resolution photos per machine",
      "Standard lead notification via email",
      "Direct contractor WhatsApp & phone connect",
      "Basic listing view analytics",
    ],
    cta: "Start Listing Free",
    href: "/register?role=vendor",
    highlight: false,
  },
  {
    name: "Vendor Pro",
    badge: "Most Popular",
    price: "₹1,999",
    period: "per month (+18% GST)",
    description: "For active equipment rental agencies looking to scale bookings and regional reach.",
    features: [
      "Up to 25 active machine listings",
      "10 photos + video walkthrough links",
      "Verified Vendor trust badge on search",
      "Instant SMS & WhatsApp lead alerts",
      "3 featured homepage spotlight boosts/month",
      "Detailed enquiry & HMR analytics dashboard",
    ],
    cta: "Upgrade to Pro",
    href: "/register?role=vendor",
    highlight: true,
  },
  {
    name: "Enterprise Fleet",
    badge: "High Volume",
    price: "₹4,999",
    period: "per month (+18% GST)",
    description: "For large construction enterprises, crane hire companies, and nationwide depots.",
    features: [
      "Unlimited machinery listings",
      "Priority placement in category & city searches",
      "Bulk CSV / Excel fleet import support",
      "Dedicated account manager & RFQ matching",
      "Custom branded vendor storefront",
      "Priority phone & ticket resolution SLA",
    ],
    cta: "Contact Enterprise Desk",
    href: "/contact",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="section-container py-16 sm:py-20 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Transparent Pricing · Zero Hidden Commissions
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
          Simple, Predictable Fleet Subscriptions
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Unlike traditional brokers who charge 5–10% on every rental transaction, InfraQuip charges a flat, predictable subscription fee. You keep 100% of your rental revenue.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-3xl border p-8 flex flex-col justify-between transition-all duration-300 ${
              plan.highlight
                ? "border-amber-500/50 bg-card shadow-xl shadow-amber-500/5 ring-2 ring-amber-500/20"
                : "border-border bg-card/60 hover:border-border/80"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3.5 py-0.5 text-xs font-bold text-slate-950 shadow-md">
                {plan.badge}
              </span>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                {!plan.highlight && (
                  <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                    {plan.badge}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-6 min-h-[32px] leading-relaxed">
                {plan.description}
              </p>

              <div className="mb-6 pb-6 border-b border-border">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                </div>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>

              {/* Feature list */}
              <div className="space-y-3 mb-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Included Capabilities:
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-tight text-foreground/90">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <Button
                asChild
                size="lg"
                className={`w-full rounded-xl font-bold ${
                  plan.highlight
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
                    : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                }`}
              >
                <Link href={plan.href}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust Guarantee Banner */}
      <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 max-w-4xl mx-auto space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          7-Day Risk-Free Money-Back Guarantee
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Try any paid subscription tier risk-free. If you do not receive qualified contractor inquiries within your first 7 days, let us know and we will issue a full, prompt refund.
        </p>
        <div className="pt-2 flex justify-center gap-4 text-xs">
          <Link href="/refund" className="text-primary hover:underline font-medium">
            Read Refund Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="text-primary hover:underline font-medium">
            Subscription Terms
          </Link>
          <span>·</span>
          <Link href="/contact" className="text-primary hover:underline font-medium">
            Billing Support
          </Link>
        </div>
      </div>
    </div>
  );
}
