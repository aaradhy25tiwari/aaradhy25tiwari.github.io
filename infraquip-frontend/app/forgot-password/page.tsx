import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import Link from "next/link";
import { Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Reset Password | InfraQuip",
  description: "Reset your InfraQuip account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
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
          <h1 className="text-2xl font-bold mt-6 mb-1">Reset your password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Remembered it?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
