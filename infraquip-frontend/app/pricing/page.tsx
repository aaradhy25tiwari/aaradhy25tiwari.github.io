import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | InfraQuip",
  description: "Explore InfraQuip subscription plans for vendors and customers.",
};

export default function PricingPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-3xl border border-border bg-card p-10 text-center">
          <h1 className="text-4xl font-semibold">Transparent pricing for every equipment business</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Choose the plan that fits your fleet size and enquiry volume. InfraQuip makes it easy for vendors and customers to scale with predictable subscription pricing.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              Get started
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:bg-muted">
              Already have an account?
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Vendor Free</h2>
            <p className="mt-3 text-muted-foreground">Starter plan for new vendors with limited listings and enquiries.</p>
            <div className="mt-6 space-y-3">
              <p>• Up to 5 active listings</p>
              <p>• 5 photos per machine</p>
              <p>• Basic analytics</p>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Vendor Pro</h2>
            <p className="mt-3 text-muted-foreground">Grow your business with more listings and premium exposure.</p>
            <div className="mt-6 space-y-3">
              <p>• Up to 25 active listings</p>
              <p>• Featured listing boost</p>
              <p>• Full analytic reports</p>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Customer Business</h2>
            <p className="mt-3 text-muted-foreground">For construction companies with high enquiry volume.</p>
            <div className="mt-6 space-y-3">
              <p>• Unlimited enquiries</p>
              <p>• Bulk RFQ support</p>
              <p>• Priority vendor responses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
