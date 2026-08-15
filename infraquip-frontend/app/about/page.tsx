import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Shield, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | InfraQuip",
  description:
    "InfraQuip is India's trusted B2B marketplace for construction equipment rental and sales. Connecting vendors with construction companies across the country.",
  openGraph: {
    title: "About InfraQuip — Construction Equipment Marketplace",
    description:
      "Learn about InfraQuip's mission to transform India's construction equipment rental sector with transparency, trust, and technology.",
  },
};

const VALUES = [
  {
    icon: Shield,
    title: "Trust & Verification",
    description:
      "Every vendor and listing is verified before going live. We ensure equipment quality, transparent pricing, and legitimate business credentials.",
  },
  {
    icon: TrendingUp,
    title: "Market Efficiency",
    description:
      "We eliminate broker asymmetry and offline negotiation friction by creating a transparent repository of verified equipment across India.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "Built for Tier 2 and Tier 3 cities, InfraQuip prioritises regional equipment discovery and local vendor-customer connections.",
  },
];

export default function AboutPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-4xl space-y-16">
        {/* Hero */}
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Wrench className="h-8 w-8 text-primary" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Building India&apos;s most trusted equipment marketplace
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
            InfraQuip is a multi-sided B2B marketplace that streamlines the
            leasing, tracking, and management of heavy construction machinery.
            We serve as a secure, high-trust operational bridge linking equipment
            vendors, construction enterprise customers, and independent brokers.
          </p>
        </div>

        {/* Mission */}
        <div className="rounded-3xl border border-border bg-card p-10">
          <h2 className="text-2xl font-semibold">Our Mission</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            To become the most trusted digital marketplace for construction
            equipment rental and purchase in India — starting regional, going
            national. We are building a platform where a construction company
            in Pune can find an excavator for rent within minutes, compare
            pricing transparently, verify the vendor, and enquire — all without
            making a single phone call.
          </p>
        </div>

        {/* Values */}
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-2xl border border-border bg-card p-6 space-y-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <value.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-3xl border border-border bg-card p-10 text-center space-y-4">
          <h2 className="text-2xl font-semibold">Ready to get started?</h2>
          <p className="text-muted-foreground">
            Join thousands of equipment vendors and construction companies
            across India.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/register?role=vendor"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              List Your Equipment
            </Link>
            <Link
              href="/machines"
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:bg-muted"
            >
              Browse Equipment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
