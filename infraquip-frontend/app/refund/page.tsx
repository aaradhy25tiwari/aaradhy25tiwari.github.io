import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, RefreshCw, HelpCircle, Mail, Phone, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy — InfraQuip",
  description:
    "Review InfraQuip's transparent cancellation, subscription refund, and billing dispute policies for equipment vendors and contractors.",
  openGraph: {
    title: "Cancellation & Refund Policy | InfraQuip",
    description: "Learn how subscription cancellations, prorated refunds, and billing disputes are handled on InfraQuip.",
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <RefreshCw className="h-3.5 w-3.5" />
            Fair &amp; Transparent Billing
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Cancellation &amp; Refund Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: September 2026 · Compliant with Consumer Protection (E-Commerce) Rules, 2020
          </p>
          <p className="text-muted-foreground leading-relaxed">
            At <strong>InfraQuip Technologies India Private Limited</strong>, we strive to provide complete transparency in our subscription billing and digital marketplace services. This policy outlines when and how refunds and subscription cancellations are processed.
          </p>
        </div>

        <div className="space-y-8 divide-y divide-border">
          {/* Section 1 */}
          <section className="space-y-3 pt-6 first:pt-0">
            <h2 className="text-xl font-semibold text-foreground">1. Vendor &amp; Contractor Subscriptions</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                InfraQuip offers tiered monthly and annual subscription plans (e.g., Vendor Pro, Contractor Business) that unlock listing slots, verified badges, and unlimited RFQs.
              </p>
              <p>
                <strong className="text-foreground">7-Day Cooling-Off Window:</strong> If you upgrade to a paid subscription and are unsatisfied for any reason, you may request a <strong>100% full refund</strong> within 7 calendar days of your initial purchase, provided you have not utilized more than 2 verified listing boosts or contacted more than 5 private leads during this period.
              </p>
              <p>
                <strong className="text-foreground">Subscription Cancellations:</strong> You can cancel recurring renewals anytime directly from your dashboard settings. Upon cancellation, your subscription remains active until the end of the current billing cycle without further charges.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">2. Machine Listing &amp; Boost Fees</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Individual promotional listing boosts and spotlight ads are digital services delivered immediately upon admin verification.
              </p>
              <p>
                If a listing submission is rejected by our compliance team due to incomplete documentation or invalid serial numbers, you will be offered the opportunity to rectify the details or receive a full credit refund to your payment method.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">3. Double Charges &amp; Technical Errors</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                In the rare event that your account is charged twice for the same billing cycle due to a gateway or connectivity error, the duplicate amount will be refunded automatically within <strong>3 to 5 business days</strong> to the original payment method.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">4. Equipment Rental Leases &amp; Security Deposits</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                InfraQuip operates as a marketplace discovery and enquiry facilitation platform. Direct equipment rental contracts, machine mobilization deposits, and operator wage agreements are executed directly between the equipment vendor and the contractor.
              </p>
              <p>
                Refunds related to equipment breakdown on site or mobilization cancellations are governed by the bilateral agreement signed between the vendor and customer. Our support desk assists in mediation and dispute logs if required.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">5. How to Request a Refund</h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                To request a refund under the 7-day cooling-off window or report a billing dispute:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Email our billing desk at <a href="mailto:billing@infraquip.com" className="text-primary hover:underline font-medium">billing@infraquip.com</a> with your registered email and Razorpay Payment ID.</li>
                <li>State the reason for your refund request.</li>
                <li>Our billing team will review and acknowledge your request within 24 hours. Approved refunds are credited within 5-7 working days.</li>
              </ol>
            </div>
          </section>

          {/* Section 6: Corporate Details */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">6. Billing Helpdesk &amp; Legal Entity</h2>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                <span>InfraQuip Technologies India Private Limited</span>
              </div>
              <p>Unit 402, 4th Floor, Panchshil Business Park, Balewadi High Street, Pune, Maharashtra 411045, India</p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs">
                <a href="mailto:billing@infraquip.com" className="flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" /> billing@infraquip.com
                </a>
                <a href="tel:+919876543210" className="flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" /> +91-9876543210
                </a>
                <span>CIN: U74999PN2024PTC198765</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
