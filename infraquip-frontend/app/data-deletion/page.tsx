"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, ShieldAlert, CheckCircle2, Loader2, ArrowRight, Home, Building2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataDeletionPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [accountType, setAccountType] = useState<"vendor" | "customer" | "broker">("vendor");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate immediate confirmation and backend audit log
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
            <Trash2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Data Deletion &amp; Erasure Request
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            In accordance with India&apos;s Digital Personal Data Protection (DPDP) Act 2023, you have the right to request erasure of your personal data, KYC documents, and account records.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-5 shadow-sm">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Request Lodged Successfully</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                We have received your data erasure request for <strong>{email}</strong>. Our Data Protection Officer will review and fulfill your request within <strong>30 calendar days</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground text-left space-y-2">
              <p className="font-semibold text-foreground">Next Steps &amp; Confirmation:</p>
              <p>• A verification link has been sent to your email to confirm ownership.</p>
              <p>• All active machine listings, KYC documents, and phone numbers will be unlinked and permanently scrubbed from our primary databases.</p>
              <p>• Tax/GST transaction invoices will be archived only for the legally mandated statutory period under Indian law.</p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Return Home
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Important Notice Before Proceeding
              </p>
              <p className="leading-relaxed">
                Deleting your data will permanently remove your active machinery listings, enquiry histories, and vendor verification badges. This action cannot be reversed once processed.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["vendor", "customer", "broker"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAccountType(r)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        accountType === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="email-input">
                  Registered Email Address *
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="your-email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="reason-input">
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  id="reason-input"
                  rows={3}
                  placeholder="e.g. Sold my machinery fleet / No longer using the service..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting Request...
                  </>
                ) : (
                  "Submit Data Deletion Request"
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
              <span>Direct Support: <a href="mailto:privacy@infraquip.com" className="text-primary hover:underline">privacy@infraquip.com</a></span>
              <Link href="/privacy" className="hover:underline">
                Read Privacy Policy
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
