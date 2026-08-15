import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Wrench } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Set New Password — InfraQuip",
  description: "You must set a new password before using InfraQuip.",
  robots: { index: false, follow: false },
};

export default function ChangePasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-gradient-amber">InfraQuip</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-1">Set Your Password</h1>
          <p className="text-muted-foreground text-sm">
            Create a secure password for your InfraQuip account.
          </p>
        </div>

        <div className="card-surface p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
