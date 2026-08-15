import type { Metadata } from "next";
import { Mail, MessageSquare, Clock, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | InfraQuip",
  description:
    "Get in touch with the InfraQuip team. Reach out for support, partnership inquiries, or general questions about our construction equipment marketplace.",
  openGraph: {
    title: "Contact InfraQuip — We're Here to Help",
    description:
      "Have a question about listing equipment, sending an enquiry, or your subscription? Our team is ready to help.",
  },
};

const CONTACT_METHODS = [
  {
    icon: Mail,
    title: "Email",
    details: "support@infraquip.com",
    description: "We respond within 24 hours on business days.",
    href: "mailto:support@infraquip.com",
  },
  {
    icon: MessageSquare,
    title: "In-App Chat",
    details: "Available in dashboard",
    description: "Logged-in users can chat with vendors and support.",
  },
  {
    icon: Clock,
    title: "Response Time",
    details: "Within 24 hours",
    description: "We aim to respond to all enquiries within one business day.",
  },
  {
    icon: MapPin,
    title: "Service Area",
    details: "Pan India",
    description:
      "Currently serving Tier 2 and Tier 3 cities, expanding to all major metros.",
  },
];

export default function ContactPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Get in touch</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Have a question about listing equipment, sending an enquiry, or your
            subscription? We&apos;re here to help.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid gap-6 sm:grid-cols-2">
          {CONTACT_METHODS.map((method) => (
            <div
              key={method.title}
              className="rounded-2xl border border-border bg-card p-6 space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <method.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{method.title}</h3>
              {method.href ? (
                <a
                  href={method.href}
                  className="block text-sm text-primary hover:underline font-medium"
                >
                  {method.details}
                </a>
              ) : (
                <p className="text-sm text-foreground font-medium">
                  {method.details}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {method.description}
              </p>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="rounded-3xl border border-border bg-card p-10 space-y-6">
          <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold">How do I list my equipment?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Register as a vendor, complete your profile, and click &ldquo;Add
                Machine&rdquo; from your dashboard. Your listing will be reviewed
                and published within 24 hours.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Is InfraQuip free to use?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Yes! Browsing listings is always free. Vendors get 5 free
                listings. Customers get 5 free enquiries per month. Upgrade plans
                are available for higher usage.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                How do I reset my password?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Click &ldquo;Forgot Password&rdquo; on the login page. Enter your
                email, and we&apos;ll send you a reset link.
              </p>
            </div>
          </div>
        </div>

        {/* Support Note */}
        <p className="text-center text-xs text-muted-foreground">
          For urgent issues, please use the in-app chat or email us directly.
          We do not provide phone support at this time.
        </p>
      </div>
    </div>
  );
}
