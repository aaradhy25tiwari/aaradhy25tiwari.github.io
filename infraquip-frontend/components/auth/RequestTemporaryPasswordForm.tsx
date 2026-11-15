"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, CheckCircle, KeyRound, AlertTriangle, ArrowRight, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Enter the complete 6-digit verification code"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export function RequestTemporaryPasswordForm() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams?.get("email") || "";
  const initialStep =
    (searchParams?.get("step") === "otp" || searchParams?.get("otp_sent") === "true") && prefilledEmail
      ? "otp"
      : "email";

  const [step, setStep] = useState<"email" | "otp" | "success">(initialStep);
  const [email, setEmail] = useState(prefilledEmail);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPermanentPassword, setIsPermanentPassword] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Active flow references to avoid stale closure race conditions
  const activeFlowIdRef = useRef(0);
  const activeEmailRef = useRef(prefilledEmail.trim().toLowerCase());
  const activeStepRef = useRef<"email" | "otp" | "success">(initialStep);

  // Email form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
    watch: watchEmail,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: prefilledEmail },
  });

  // OTP form
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors, isSubmitting: isSubmittingOtp },
    reset: resetOtp,
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const emailValue = watchEmail("email");

  const onEmailSubmit = async (data: EmailFormData) => {
    setServerError(null);
    setIsPermanentPassword(false);
    setIsBlocked(false);

    try {
      const resp = await apiClient.post<{
        success: boolean;
        message: string;
        eligible?: boolean;
        requires_otp?: boolean;
      }>("/auth/request-temporary-password", {
        email: data.email.trim().toLowerCase(),
      });

      if (resp.data.eligible === false) {
        setIsPermanentPassword(true);
        setServerError(resp.data.message);
        return;
      }

      const targetEmail = data.email.trim().toLowerCase();
      activeFlowIdRef.current += 1;
      activeEmailRef.current = targetEmail;
      activeStepRef.current = "otp";
      setEmail(targetEmail);
      setStep("otp");
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || "Failed to request temporary password.";

      if (status === 403) {
        setIsBlocked(true);
      }
      setServerError(detail);
    }
  };

  const onOtpSubmit = async (data: OtpFormData) => {
    const flowId = activeFlowIdRef.current;
    const currentEmail = activeEmailRef.current;
    if (!currentEmail || activeStepRef.current !== "otp") return;

    setServerError(null);

    try {
      const resp = await apiClient.post<{
        success: boolean;
        message: string;
      }>("/auth/verify-temporary-password-otp", {
        email: currentEmail,
        otp: data.otp.trim(),
      });

      // Avoid applying results if user navigated to a different flow
      if (activeFlowIdRef.current !== flowId || activeEmailRef.current !== currentEmail || activeStepRef.current !== "otp") {
        return;
      }

      setVerifiedEmail(currentEmail);
      setSuccessMessage(
        resp.data.message ||
          "Identity verified! A fresh temporary password (valid for 24 hours) has been sent to your email address."
      );
      activeStepRef.current = "success";
      setStep("success");
    } catch (err: any) {
      if (activeFlowIdRef.current !== flowId || activeEmailRef.current !== currentEmail || activeStepRef.current !== "otp") {
        return;
      }
      const detail = err?.response?.data?.detail || err?.message || "Failed to verify code.";
      setServerError(detail);
    }
  };

  const handleResendOtp = async () => {
    const flowId = activeFlowIdRef.current;
    const currentEmail = activeEmailRef.current;
    if (!currentEmail || activeStepRef.current !== "otp") return;

    setIsResending(true);
    setServerError(null);
    setResendSuccess(false);

    try {
      const resp = await apiClient.post<{
        success: boolean;
        message: string;
        eligible?: boolean;
        requires_otp?: boolean;
      }>("/auth/request-temporary-password", {
        email: currentEmail,
      });

      // Ignore stale response if user navigated away or changed flow
      if (activeFlowIdRef.current !== flowId || activeEmailRef.current !== currentEmail || activeStepRef.current !== "otp") {
        return;
      }

      if (resp.data.eligible === false) {
        setIsPermanentPassword(true);
        setServerError(resp.data.message);
        activeStepRef.current = "email";
        setStep("email");
        return;
      }

      setResendSuccess(true);
      resetOtp();
      setTimeout(() => {
        if (activeFlowIdRef.current === flowId && activeStepRef.current === "otp") {
          setResendSuccess(false);
        }
      }, 5000);
    } catch (err: any) {
      if (activeFlowIdRef.current !== flowId || activeEmailRef.current !== currentEmail || activeStepRef.current !== "otp") {
        return;
      }
      setServerError(err?.response?.data?.detail || "Failed to resend code.");
    } finally {
      if (activeFlowIdRef.current === flowId) {
        setIsResending(false);
      }
    }
  };

  if (step === "success") {
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
          href={`/login${(verifiedEmail || email) ? `?email=${encodeURIComponent(verifiedEmail || email)}` : ""}`}
          className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
        >
          Proceed to Log In →
        </Link>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="card-surface p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={isSubmittingOtp || isResending}
            onClick={() => {
              if (isSubmittingOtp || isResending) return;
              activeFlowIdRef.current += 1;
              activeStepRef.current = "email";
              setStep("email");
              setServerError(null);
              setIsPermanentPassword(false);
              setResendSuccess(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <span className="text-xs text-muted-foreground font-mono">{email}</span>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <KeyRound className="h-3.5 w-3.5" /> Step 2: Verify Identity
          </div>
          <h2 className="text-xl font-bold">Enter Verification Code</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We sent a 6-digit one-time code to <strong className="text-foreground">{email}</strong>. Enter it below to receive your new temporary password.
          </p>
        </div>

        <form onSubmit={handleSubmitOtp(onOtpSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="otp" className="text-sm font-medium text-foreground">
              6-Digit Verification Code
            </label>
            <input
              id="otp"
              type="text"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              {...registerOtp("otp")}
              className={`w-full rounded-xl border bg-background px-4 py-3 text-center font-mono text-xl tracking-widest outline-none transition-all
                focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${otpErrors.otp ? "border-destructive" : "border-border"}`}
            />
            {otpErrors.otp && (
              <p className="text-xs text-destructive text-center">{otpErrors.otp.message}</p>
            )}
          </div>

          {resendSuccess && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
              ✅ A new verification code has been sent to your email.
            </div>
          )}

          {serverError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive text-center">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full btn-amber-glow"
            size="lg"
            disabled={isSubmittingOtp}
          >
            {isSubmittingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying & Generating Password...
              </>
            ) : (
              <>
                Verify & Receive Temporary Password
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
              Didn&apos;t receive code? Resend
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step === "email"
  return (
    <div className="card-surface p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold">
          <KeyRound className="h-3.5 w-3.5" />
          Expired or Missing Temporary Password
        </div>
        <h2 className="text-xl font-bold">Request a New Temporary Password</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If your account was approved or reactivated but your 24-hour temporary password has expired, enter your registered email below to receive a verification code.
        </p>
      </div>

      <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4" noValidate>
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
              {...registerEmail("email")}
              className={`w-full rounded-xl border bg-background px-4 py-3 pl-10 text-sm outline-none transition-all
                focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${emailErrors.email ? "border-destructive" : "border-border"}`}
            />
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {emailErrors.email && (
            <p className="text-xs text-destructive">{emailErrors.email.message}</p>
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
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
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
          disabled={isSubmittingEmail}
        >
          {isSubmittingEmail ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending Verification Code...
            </>
          ) : (
            <>
              Send Verification Code
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
