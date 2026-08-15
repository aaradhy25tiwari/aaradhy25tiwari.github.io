import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | InfraQuip",
  description:
    "InfraQuip's privacy policy explains how we collect, use, and protect your personal data in compliance with India's Digital Personal Data Protection Act, 2023.",
  openGraph: {
    title: "Privacy Policy | InfraQuip",
    description:
      "Learn how InfraQuip handles your personal data, your rights, and our commitment to data protection.",
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
            Last updated: July 14, 2026
          </p>
          <p className="text-muted-foreground leading-relaxed">
            At InfraQuip, we take your privacy seriously. This policy explains
            how we collect, use, disclose, and safeguard your information when
            you use our platform. We comply with the Digital Personal Data
            Protection (DPDP) Act, 2023 of India.
          </p>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Account Information:</strong>{" "}
                When you register, we collect your name, email address, phone
                number, and role (Vendor or Customer).
              </p>
              <p>
                <strong className="text-foreground">Profile Information:</strong>{" "}
                Vendors may provide company name, GSTIN, PAN, business
                description, and profile photo. Customers may provide company
                name and designation.
              </p>
              <p>
                <strong className="text-foreground">Listing Information:</strong>{" "}
                Equipment details, photos, pricing, location data, and
                specifications that vendors choose to publish.
              </p>
              <p>
                <strong className="text-foreground">Usage Data:</strong>{" "}
                Pages visited, search queries, enquiries sent, and
                interactions with listings.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>To provide, maintain, and improve our marketplace platform.</p>
              <p>To process transactions and send transactional emails.</p>
              <p>
                To enforce platform rules, prevent fraud, and ensure
                compliance with applicable laws.
              </p>
              <p>
                To communicate with you about your account, listings,
                enquiries, and subscription status.
              </p>
              <p>
                To comply with legal obligations and respond to lawful
                requests from authorities.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Data Sharing & Disclosure</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Vendors & Customers:</strong>{" "}
                Information you provide in listings or enquiries is visible to
                the relevant counterparties as necessary for platform
                operations.
              </p>
              <p>
                <strong className="text-foreground">Service Providers:</strong>{" "}
                We share data with trusted third-party services (Supabase,
                Resend, Razorpay, Upstash) for hosting, email, payments, and
                caching. These providers are contractually bound to protect
                your data.
              </p>
              <p>
                <strong className="text-foreground">Legal Requirements:</strong>{" "}
                We may disclose information if required by law or in good
                faith belief that such action is necessary to comply with
                legal obligations.
              </p>
              <p>
                We <strong>never</strong> sell your personal data to third
                parties.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including
              encryption at rest (AES-256), TLS 1.2+ for all data in transit,
              Row-Level Security (RLS) on all database tables, and signed
              URLs for media access. Payment data is handled entirely by
              Razorpay&apos;s PCI-DSS certified infrastructure — we never store
              payment card details on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Your Rights</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Access:</strong> You can
                request a copy of the personal data we hold about you.
              </p>
              <p>
                <strong className="text-foreground">Correction:</strong> You
                can update your profile information at any time from your
                dashboard settings.
              </p>
              <p>
                <strong className="text-foreground">Deletion:</strong> You can
                request account deletion. We will delete all PII within 30
                days of your request, subject to legal retention requirements.
              </p>
              <p>
                <strong className="text-foreground">Withdraw Consent:</strong>{" "}
                You may withdraw consent for data processing at any time by
                contacting us.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For privacy-related inquiries or to exercise your rights, please
              email us at{" "}
              <a
                href="mailto:support@infraquip.com"
                className="text-primary hover:underline"
              >
                support@infraquip.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
