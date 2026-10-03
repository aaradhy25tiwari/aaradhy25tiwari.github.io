import type { Metadata } from "next";
import { Suspense } from "react";
import { ReactivateAccountForm } from "@/components/auth/ReactivateAccountForm";
import Link from "next/link";
import { Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Reactivate Account | InfraQuip",
  description: "Request reactivation for your blocked InfraQuip account.",
  robots: { index: false, follow: false },
};

export default function ReactivateAccountPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-gradient-amber">InfraQuip</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-1">Account Reactivation</h1>
          <p className="text-muted-foreground text-sm">
            Verify via email OTP to request account restoration from the admin
          </p>
        </div>
        <Suspense fallback={<div className="card-surface p-8 text-center text-sm text-muted-foreground">Loading...</div>}>
          <ReactivateAccountForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
