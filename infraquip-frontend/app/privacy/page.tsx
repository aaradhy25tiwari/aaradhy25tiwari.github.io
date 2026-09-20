import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy (DPDP Act) — InfraQuip",
  description:
    "InfraQuip's privacy policy explains how we collect, process, and protect your personal data in strict compliance with India's Digital Personal Data Protection Act, 2023.",
  openGraph: {
    title: "Privacy Policy | InfraQuip",
    description:
      "Learn how InfraQuip handles your personal data, your rights under DPDP 2023, cookie preferences, and our security commitments.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: September 2026 · Compliant with DPDP Act, 2023
          </p>
          <p className="text-muted-foreground leading-relaxed">
            At <strong>InfraQuip Technologies India Private Limited</strong> (&ldquo;InfraQuip&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), we take your data privacy seriously. This policy outlines how we collect, store, utilize, and protect your information when accessing or transacting on our digital equipment marketplace.
          </p>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Account Information:</strong>{" "}
                When you register, we collect your name, email address, mobile phone number, and account role (Vendor or Contractor).
              </p>
              <p>
                <strong className="text-foreground">Business & KYC Information:</strong>{" "}
                Vendors submit GSTIN, PAN, company registration, billing address, and representative identification for fleet verification.
              </p>
              <p>
                <strong className="text-foreground">Listing Information:</strong>{" "}
                Equipment technical specifications, year of manufacture, HMR/hour meter readings, serial numbers, geocoded GPS depot coordinates, and machine imagery.
              </p>
              <p>
                <strong className="text-foreground">Enquiry & Usage Data:</strong>{" "}
                RFQs submitted, lead contacts exchanged, chat interactions, and search query parameters.
              </p>
            </div>
          </section>

          <section className="space-y-3" id="cookies">
            <h2 className="text-xl font-semibold">2. Cookies &amp; Tracking Technologies</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                We use cookies and browser storage technologies to ensure seamless platform operation, remember your authentication session, preserve equipment filter preferences, and compile anonymized analytics.
              </p>
              <p>
                <strong className="text-foreground">Essential Cookies:</strong> Required for secure login sessions (Supabase Auth tokens), CSRF defense, and draft listing persistence.
              </p>
              <p>
                <strong className="text-foreground">Analytics Cookies:</strong> Help us analyze search query volume, location trends, and equipment category demand to improve the marketplace experience.
              </p>
              <p>
                You can configure or decline non-essential cookies at any time via our Cookie Preferences banner or your browser settings.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Purpose &amp; Lawful Processing</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>To connect verified equipment owners with prospective contractors.</p>
              <p>To prevent duplicate, fraudulent, or non-existent machinery listings.</p>
              <p>To deliver real-time SMS, WhatsApp, and transactional email lead alerts.</p>
              <p>To process subscription billing securely through PCI-DSS certified payment gateways (Razorpay).</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Security &amp; Storage</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All personal and machine data is housed in ISO 27001 / SOC 2 certified data centers with AES-256 encryption at rest and strict TLS 1.3 encryption in transit. We implement Postgres Row-Level Security (RLS) policies ensuring users can only read and modify authorized records.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Your DPDP Rights</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Right of Access & Correction:</strong> Review and update your business profile, listings, and contact information directly in your dashboard.
              </p>
              <p>
                <strong className="text-foreground">Right to Erasure:</strong> Request permanent deletion of your account and personal identifiable information upon settlement of active transactions.
              </p>
              <p>
                <strong className="text-foreground">Grievance Redressal:</strong> Submit privacy concerns directly to our Data Protection Officer.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Data Protection Officer &amp; Corporate Address</h2>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">InfraQuip Technologies India Private Limited</p>
              <p>Unit 402, 4th Floor, Panchshil Business Park, Balewadi High Street, Pune, Maharashtra 411045, India</p>
              <p>Email: <a href="mailto:privacy@infraquip.com" className="text-primary hover:underline font-medium">privacy@infraquip.com</a> / <a href="mailto:support@infraquip.com" className="text-primary hover:underline font-medium">support@infraquip.com</a></p>
              <p>CIN: U74999PN2024PTC198765</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
