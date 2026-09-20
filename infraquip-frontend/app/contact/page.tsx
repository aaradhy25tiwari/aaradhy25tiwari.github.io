import type { Metadata } from "next";
import { Mail, MessageSquare, Clock, MapPin, Phone, Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact Us — Customer Support & Corporate Office | InfraQuip",
  description:
    "Get in touch with InfraQuip's heavy equipment specialists. Call +91-9876543210, email support@infraquip.com, or visit our headquarters in Pune, Maharashtra.",
  openGraph: {
    title: "Contact InfraQuip — We're Here to Help You Build",
    description:
      "Have a question about renting, listing equipment, sending an enquiry, or your subscription? Our operations team is ready to help.",
  },
};

const CONTACT_METHODS = [
  {
    icon: Phone,
    title: "Direct Support Hotline",
    details: "+91-9876543210",
    subDetails: "+91 (20) 6789-4500",
    description: "Available Monday to Saturday, 9:00 AM to 7:00 PM IST.",
    href: "tel:+919876543210",
  },
  {
    icon: Mail,
    title: "Email Inquiries",
    details: "support@infraquip.com",
    subDetails: "sales@infraquip.com",
    description: "We respond to all inquiries within 2 to 4 business hours.",
    href: "mailto:support@infraquip.com",
  },
  {
    icon: Building2,
    title: "Registered Corporate Office",
    details: "InfraQuip Technologies India Pvt. Ltd.",
    description:
      "Unit 402, 4th Floor, Panchshil Business Park, Balewadi High Street, Pune, Maharashtra 411045, India",
    subDetails: "CIN: U74999PN2024PTC198765 | GSTIN: 27AABCI1234F1Z5",
  },
  {
    icon: MapPin,
    title: "Service Footprint",
    details: "50+ Hubs Across India",
    description:
      "Dedicated equipment depots and verified vendor networks in Pune, Mumbai, Bengaluru, Delhi NCR, Hyderabad, Ahmedabad, and beyond.",
  },
];

export default function ContactPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official Support &amp; Operations Desk
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            How Can We Assist Your Fleet?
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base">
            Whether you are looking to mobilize heavy machinery on a job site or monetize your idle fleet, our equipment specialists are at your service.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {CONTACT_METHODS.map((method) => (
            <div
              key={method.title}
              className="rounded-2xl border border-border bg-card p-6 space-y-3.5 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <method.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{method.title}</h3>
                {method.href ? (
                  <a
                    href={method.href}
                    className="block text-base text-primary hover:underline font-bold mt-1"
                  >
                    {method.details}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {method.details}
                  </p>
                )}
                {method.subDetails && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {method.subDetails}
                  </p>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {method.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quick Action Banner */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-xl font-bold text-foreground">Need Urgent Machinery on Site?</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Submit your project specifications or explore live machine listings with instant rental rates and verified operators.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button asChild size="lg" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Link href="/machines">Browse Equipment</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/register?role=vendor">List Your Machinery</Link>
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-5 divide-y divide-border">
            <div className="pt-4 first:pt-0">
              <h3 className="font-semibold text-foreground">How do I list my equipment on InfraQuip?</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Register as a vendor, verify your business credentials (GSTIN/PAN), and submit machine details using our Add Machine form. Our verification team approves listings within 24 hours.
              </p>
            </div>
            <div className="pt-4">
              <h3 className="font-semibold text-foreground">Are transactions and payments covered by InfraQuip?</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Subscription payments and listing boosts are secured by Razorpay. Direct machine rental leases and site logistics are established between verified vendors and enterprise contractors.
              </p>
            </div>
            <div className="pt-4">
              <h3 className="font-semibold text-foreground">How fast will vendors respond to my enquiry?</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Vendors on InfraQuip receive instantaneous SMS and dashboard notifications. The average first-response turnaround is under 2 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
