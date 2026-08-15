import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your InfraQuip account to manage listings, send enquiries, and track your equipment rental activity.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
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
          <h1 className="text-2xl font-bold mt-6 mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Log in to your account to continue
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
