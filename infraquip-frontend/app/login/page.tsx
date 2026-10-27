import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log In — InfraQuip",
  description: "Log in to your InfraQuip account to manage listings, send enquiries, and track your equipment rental activity.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-gradient-amber">InfraQuip</span>
          </Link>
        </div>

        <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
