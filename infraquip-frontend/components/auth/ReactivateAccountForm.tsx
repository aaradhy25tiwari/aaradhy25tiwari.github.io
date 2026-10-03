"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Mail, KeyRound, ShieldAlert, ArrowLeft, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";
import { cn, scrollToTop } from "@/lib/utils";
import Link from "next/link";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Enter the complete 6-digit verification code"),
  message: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export function ReactivateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState(initialEmail);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Step 1: Email Form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: initialEmail },
  });

  // Step 2: OTP Form
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors, isSubmitting: isSubmittingOtp },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onSendOtp = async (data: EmailFormData) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/request-reactivation", { email: data.email });
      setEmail(data.email);
      setStep("otp");
      scrollToTop();
    } catch (err: any) {
      setServerError(err.message || "Failed to send verification code. Please try again.");
    }
  };

  const onResendOtp = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    setServerError(null);
    setResendSuccess(false);
    try {
      await apiClient.post("/auth/request-reactivation", { email });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      setServerError(err.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const onVerifyOtp = async (data: OtpFormData) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/verify-reactivation-otp", {
        email,
        otp: data.otp,
        message: data.message || "",
      });
      setStep("success");
      scrollToTop();
    } catch (err: any) {
      setServerError(err.message || "Invalid or expired verification code. Please try again.");
    }
  };

  if (step === "success") {
    return (
      <div className="card-surface p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold text-xl">Reactivation Request Submitted!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your identity has been verified. The admin team has received your reactivation request and will review it shortly.
          </p>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-500 text-left">
          ⏱️ Once approved by the admin, a fresh temporary password (valid for 24 hours) will be automatically sent to <span className="font-semibold">{email}</span>.
        </div>
        <div className="pt-2">
          <Button onClick={() => router.push("/login")} className="w-full btn-amber-glow">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="card-surface p-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to email
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-lg">Enter Verification Code</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            We sent a 6-digit reactivation code to <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        {resendSuccess && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> A fresh 6-digit OTP has been sent to your email!
          </div>
        )}

        {serverError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmitOtp(onVerifyOtp)} className="space-y-4" noValidate>
          {/* OTP Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="otp-input" className="text-sm font-medium text-foreground">
                6-Digit Verification Code
              </label>
              <button
                type="button"
                onClick={onResendOtp}
                disabled={isResending}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                {isResending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                ) : (
                  <><RefreshCw className="h-3 w-3" /> Resend OTP</>
                )}
              </button>
            </div>
            <input
              id="otp-input"
              type="text"
              maxLength={6}
              placeholder="123456"
              autoFocus
              {...registerOtp("otp")}
              className={cn(
                "w-full text-center tracking-[0.4em] font-mono text-lg rounded-xl border bg-background px-4 py-2.5 outline-none transition-all",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                otpErrors.otp ? "border-destructive" : "border-border"
              )}
            />
            {otpErrors.otp && (
              <p className="text-xs text-destructive">{otpErrors.otp.message}</p>
            )}
          </div>

          {/* Optional Reason Message */}
          <div className="space-y-1.5">
            <label htmlFor="reactivation-message" className="text-sm font-medium text-foreground">
              Note for Admin <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="reactivation-message"
              rows={2}
              placeholder="e.g. I forgot my password and entered wrong attempts..."
              {...registerOtp("message")}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <Button type="submit" className="w-full btn-amber-glow mt-4 gap-2" size="lg" disabled={isSubmittingOtp}>
            {isSubmittingOtp ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verifying & Submitting...</>
            ) : (
              <><Send className="h-4 w-4" /> Verify & Request Reactivation</>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // Step 1: Email Form
  return (
    <div className="card-surface p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Reactivate Blocked Account</h2>
          <p className="text-xs text-muted-foreground">
            Verify your email identity to submit a reactivation request to the admin.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitEmail(onSendOtp)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="reactivate-email" className="text-sm font-medium text-foreground">
            Registered Account Email
          </label>
          <input
            id="reactivate-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            autoFocus
            {...registerEmail("email")}
            className={cn(
              "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              emailErrors.email ? "border-destructive" : "border-border"
            )}
          />
          {emailErrors.email && (
            <p className="text-xs text-destructive">{emailErrors.email.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="rounded-xl bg-muted/50 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Mail className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
          <span>A 6-digit OTP code will be sent to your email to verify account ownership before notifying the administrator.</span>
        </div>

        <Button type="submit" className="w-full btn-amber-glow" size="lg" disabled={isSubmittingEmail}>
          {isSubmittingEmail ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending Verification Code...</>
          ) : (
            "Send Reactivation OTP Code"
          )}
        </Button>

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
