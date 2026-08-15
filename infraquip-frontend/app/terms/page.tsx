import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | InfraQuip",
  description:
    "InfraQuip's terms of service govern the use of our construction equipment rental and sales marketplace platform.",
  openGraph: {
    title: "Terms of Service | InfraQuip",
    description:
      "Review the terms and conditions for using the InfraQuip construction equipment marketplace platform.",
  },
};

export default function TermsPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: July 14, 2026
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Welcome to InfraQuip. By accessing or using our platform, you agree
            to be bound by these terms. If you do not agree, please do not use
            our services.
          </p>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By creating an account or using InfraQuip, you acknowledge that
              you have read, understood, and agree to be bound by these Terms
              of Service and our Privacy Policy. These terms apply to all
              visitors, users, vendors, customers, and others who access or
              use the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. User Accounts</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                You are responsible for maintaining the confidentiality of
                your account credentials and for all activities that occur
                under your account.
              </p>
              <p>
                You must provide accurate, current, and complete information
                during registration and keep your profile information updated.
              </p>
              <p>
                You may not create multiple accounts, impersonate others, or
                use the platform for any illegal or unauthorized purpose.
              </p>
              <p>
                We reserve the right to suspend or terminate accounts that
                violate these terms.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. Vendor Listings</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Vendors are solely responsible for the accuracy and legality
                of their equipment listings, including descriptions, pricing,
                photos, and specifications.
              </p>
              <p>
                All listings are subject to review and approval by InfraQuip
                before going live. We reserve the right to reject or remove
                any listing that violates our guidelines.
              </p>
              <p>
                Vendors must not list equipment they do not own or have
                explicit authorization to rent or sell.
              </p>
              <p>
                Vendors agree to respond to enquiries in a timely manner and
                maintain accurate availability status.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Customer Use</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Customers agree to use the platform for legitimate equipment
                sourcing purposes only.
              </p>
              <p>
                Sending false or spam enquiries, misrepresenting your
                identity, or engaging in fraudulent activity is strictly
                prohibited.
              </p>
              <p>
                Rental and purchase agreements are directly between vendors
                and customers. InfraQuip facilitates discovery and enquiry
                but is not a party to any transaction unless explicitly stated.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Subscriptions & Payments</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Subscription fees are charged in advance on a monthly basis
                and are non-refundable except as required by applicable law.
              </p>
              <p>
                Downgrading your subscription tier will not delete excess
                listings — they will be automatically paused until you are
                within the new tier&apos;s limit.
              </p>
              <p>
                Payments are processed securely through Razorpay. We do not
                store payment card information on our servers.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              InfraQuip provides a platform for connecting equipment vendors
              with customers. We are not responsible for the condition,
              quality, safety, or legality of listed equipment. All
              transactions, rental agreements, and equipment usage terms are
              solely between the vendor and customer. InfraQuip shall not be
              liable for any direct, indirect, incidental, or consequential
              damages arising from your use of the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Changes
              will be effective immediately upon posting. Your continued use
              of the platform after changes constitutes acceptance of the new
              terms. We will notify users of material changes via email or
              platform notification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these terms, please contact us at{" "}
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

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pt-8 border-t border-border">
          These terms are governed by the laws of India. Any disputes shall be
          subject to the exclusive jurisdiction of the courts in Pune,
          Maharashtra. For any questions, visit our{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
