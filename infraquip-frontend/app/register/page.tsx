import type { Metadata } from "next";
import { AccountRequestForm } from "@/components/auth/AccountRequestForm";
import Link from "next/link";
import { Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Request Access — InfraQuip",
  description:
    "Apply for access to InfraQuip — India's construction equipment marketplace. Vendors and contractors submit a request; our team reviews and sends credentials within 24 hours.",
  robots: { index: true, follow: true },
};

export default function RequestAccessPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="w-full max-w-lg px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-gradient-amber">InfraQuip</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-1">Request Platform Access</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            InfraQuip is an invite-only marketplace. Submit your details and
            we'll send you credentials within 24 hours.
          </p>
        </div>

        <AccountRequestForm />

        <p className="text-center text-xs text-muted-foreground mt-6">
          By requesting access, you agree to our{" "}
          <Link href="/terms" className="hover:underline">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
