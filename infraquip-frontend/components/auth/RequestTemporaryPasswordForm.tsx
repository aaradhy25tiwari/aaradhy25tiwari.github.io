"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, CheckCircle, KeyRound, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export function RequestTemporaryPasswordForm() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams?.get("email") || "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPermanentPassword, setIsPermanentPassword] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: prefilledEmail },
  });

  const emailValue = watch("email");

  const onSubmit = async (data: RequestFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsPermanentPassword(false);
    setIsBlocked(false);

    try {
      const resp = await apiClient.post<{
        success: boolean;
        message: string;
        eligible?: boolean;
      }>("/auth/request-temporary-password", {
        email: data.email.trim().toLowerCase(),
      });

      if (resp.data.eligible === false) {
        setIsPermanentPassword(true);
        setServerError(resp.data.message);
        return;
      }

      setSuccessMessage(
        resp.data.message ||
          "A fresh temporary password (valid for 24 hours) has been sent to your registered email address."
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || "Failed to request temporary password.";

      if (status === 403) {
        setIsBlocked(true);
      }
      setServerError(detail);
    }
  };

  if (successMessage) {
    return (
      <div className="card-surface p-6 sm:p-8 space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Temporary Password Sent!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {successMessage}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400 text-left">
          <p className="font-semibold mb-1">⏱️ Important (Valid 24 Hours):</p>
          <p className="text-[11px] leading-relaxed">
            Use the temporary password from your email to log in. You will be prompted to set your personal permanent password immediately after signing in.
          </p>
        </div>

        <Link
          href={`/login${emailValue ? `?email=${encodeURIComponent(emailValue)}` : ""}`}
          className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
        >
          Proceed to Log In →
        </Link>
      </div>
    );
  }

  return (
    <div className="card-surface p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold">
          <KeyRound className="h-3.5 w-3.5" />
          Expired or Missing Temporary Password
        </div>
        <h2 className="text-xl font-bold">Request a New Temporary Password</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If your account was approved or reactivated but your 24-hour temporary password has expired, enter your registered email below to receive a fresh one.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Registered Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("email")}
              className={`w-full rounded-xl border bg-background px-4 py-3 pl-10 text-sm outline-none transition-all
                focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${errors.email ? "border-destructive" : "border-border"}`}
            />
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {serverError && isBlocked && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{serverError}</p>
            </div>
            <Link
              href={`/reactivate-account${emailValue ? `?email=${encodeURIComponent(emailValue)}` : ""}`}
              className="inline-flex items-center gap-1 font-semibold text-destructive underline hover:opacity-80"
            >
              Go to Account Reactivation →
            </Link>
          </div>
        )}

        {serverError && isPermanentPassword && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-600 dark:text-amber-400 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{serverError}</p>
            </div>
            <Link
              href={`/forgot-password${emailValue ? `?email=${encodeURIComponent(emailValue)}` : ""}`}
              className="inline-flex items-center gap-1 font-semibold text-primary underline hover:opacity-80"
            >
              Go to Reset Password (OTP) →
            </Link>
          </div>
        )}

        {serverError && !isBlocked && !isPermanentPassword && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive">
            {serverError}
          </div>
        )}

        <Button
          type="submit"
          className="w-full btn-amber-glow"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending Temporary Password...
            </>
          ) : (
            <>
              Email New Temporary Password
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
