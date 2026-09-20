import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, Shield, Info, Settings, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy — InfraQuip",
  description:
    "Learn how InfraQuip uses cookies, session storage, and third-party analytics to deliver secure equipment marketplace experiences.",
  openGraph: {
    title: "Cookie Policy | InfraQuip",
    description: "Detailed inventory of cookies, purpose of data collection, and how to manage your privacy preferences on InfraQuip.",
  },
};

const COOKIE_INVENTORY = [
  {
    name: "sb-*-auth-token",
    category: "Strictly Necessary",
    provider: "Supabase Auth",
    purpose: "Maintains secure logged-in sessions for vendors, contractors, and administrators.",
    expiry: "Session / 7 Days",
  },
  {
    name: "infraquip_cookie_consent",
    category: "Strictly Necessary",
    provider: "InfraQuip",
    purpose: "Stores user's cookie banner selection (Accepted / Declined).",
    expiry: "1 Year",
  },
  {
    name: "iq_draft_listing",
    category: "Functional",
    provider: "InfraQuip (Local Storage)",
    purpose: "Preserves your in-progress machine listing data so you don't lose progress during submission.",
    expiry: "Persistent until published or discarded",
  },
  {
    name: "_ga, _ga_*",
    category: "Analytics",
    provider: "Google Analytics 4",
    purpose: "Measures anonymous visitor metrics (pages visited, equipment category searches) to optimize marketplace features.",
    expiry: "2 Years",
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Cookie className="h-3.5 w-3.5" />
            Cookie &amp; Browser Storage Standards
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Cookie Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: September 2026 · Compliant with Digital Personal Data Protection (DPDP) Act, 2023
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This Cookie Policy explains how <strong>InfraQuip Technologies India Private Limited</strong> uses cookies, local browser storage, and related technologies on our website and marketplace platform.
          </p>
        </div>

        <div className="space-y-8 divide-y divide-border">
          {/* Section 1 */}
          <section className="space-y-3 pt-6 first:pt-0">
            <h2 className="text-xl font-semibold text-foreground">1. What Are Cookies?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work efficiently, remember your preferences, secure your account authentication, and provide anonymized analytical reports to site owners.
            </p>
          </section>

          {/* Section 2: Table */}
          <section className="space-y-4 pt-6">
            <h2 className="text-xl font-semibold text-foreground">2. Inventory of Cookies Used on InfraQuip</h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/50 border-b border-border text-foreground font-semibold">
                  <tr>
                    <th className="p-3 sm:p-4">Cookie / Key</th>
                    <th className="p-3 sm:p-4">Category</th>
                    <th className="p-3 sm:p-4">Provider</th>
                    <th className="p-3 sm:p-4">Purpose</th>
                    <th className="p-3 sm:p-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {COOKIE_INVENTORY.map((c) => (
                    <tr key={c.name} className="hover:bg-muted/20">
                      <td className="p-3 sm:p-4 font-mono font-medium text-foreground">{c.name}</td>
                      <td className="p-3 sm:p-4">
                        <span className="inline-block rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                          {c.category}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">{c.provider}</td>
                      <td className="p-3 sm:p-4 leading-relaxed">{c.purpose}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{c.expiry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Managing Preferences */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">3. How to Manage Your Cookie Preferences</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                When you first visit InfraQuip, you are presented with our Cookie Consent Banner allowing you to accept or decline non-essential cookies.
              </p>
              <p>
                You can also configure your web browser (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge) to refuse cookies or alert you when cookies are being sent. Note that disabling essential cookies may impact account logins and dashboard functionality.
              </p>
            </div>
          </section>

          {/* Section 4: Contact */}
          <section className="space-y-3 pt-6">
            <h2 className="text-xl font-semibold text-foreground">4. Privacy Contact</h2>
            <div className="rounded-2xl border border-border bg-card p-6 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                <span>InfraQuip Technologies India Private Limited</span>
              </div>
              <p>Unit 402, 4th Floor, Panchshil Business Park, Balewadi High Street, Pune, Maharashtra 411045, India</p>
              <p>For cookie queries, email: <a href="mailto:privacy@infraquip.com" className="text-primary hover:underline font-medium">privacy@infraquip.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
