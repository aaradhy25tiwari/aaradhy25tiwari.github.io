"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, Mail, KeyRound, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";
import { cn, scrollToTop } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const resetSchema = z
  .object({
    otp: z.string().length(6, "Enter the complete 6-digit OTP code"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type EmailFormData = z.infer<typeof emailSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number (0-9)", test: (p: string) => /[0-9]/.test(p) },
];

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Step 1: Email Form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
  } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });

  // Step 2: Reset Form
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    watch: watchReset,
    formState: { errors: resetErrors, isSubmitting: isSubmittingReset },
  } = useForm<ResetFormData>({ resolver: zodResolver(resetSchema) });

  const passwordValue = watchReset("password") || "";

  const onSendOtp = async (data: EmailFormData) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/forgot-password", { email: data.email });
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
      await apiClient.post("/auth/forgot-password", { email });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      setServerError(err.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const onResetPassword = async (data: ResetFormData) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/reset-password", {
        email,
        otp: data.otp,
        new_password: data.password,
        confirm_password: data.confirmPassword,
      });
      setStep("success");
      scrollToTop();
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setServerError(err.message || "Failed to reset password. Please check your OTP and try again.");
    }
  };

  if (step === "success") {
    return (
      <div className="card-surface p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="font-semibold text-xl">Password Reset Successful! 🎉</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account password has been updated. Redirecting you to the login page...
        </p>
        <Button onClick={() => router.push("/login")} className="w-full btn-amber-glow mt-4">
          Go to Login
        </Button>
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
            <h2 className="font-semibold text-lg">Enter OTP & Set Password</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>.
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

        <form onSubmit={handleSubmitReset(onResetPassword)} className="space-y-4" noValidate>
          {/* OTP Code */}
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
              {...registerReset("otp")}
              className={cn(
                "w-full text-center tracking-[0.4em] font-mono text-lg rounded-xl border bg-background px-4 py-2.5 outline-none transition-all",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                resetErrors.otp ? "border-destructive" : "border-border"
              )}
            />
            {resetErrors.otp && (
              <p className="text-xs text-destructive">{resetErrors.otp.message}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                {...registerReset("password")}
                className={cn(
                  "w-full rounded-xl border bg-background px-4 py-2.5 pr-10 text-sm outline-none transition-all",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                  resetErrors.password ? "border-destructive" : "border-border"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {resetErrors.password && (
              <p className="text-xs text-destructive">{resetErrors.password.message}</p>
            )}

            {/* Password rules indicator */}
            {passwordValue.length > 0 && (
              <ul className="mt-2 space-y-1 pt-1">
                {passwordRules.map((r) => {
                  const passed = r.test(passwordValue);
                  return (
                    <li key={r.label} className={cn("flex items-center gap-1.5 text-xs", passed ? "text-emerald-500" : "text-muted-foreground")}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", passed ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              {...registerReset("confirmPassword")}
              className={cn(
                "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-all",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                resetErrors.confirmPassword ? "border-destructive" : "border-border"
              )}
            />
            {resetErrors.confirmPassword && (
              <p className="text-xs text-destructive">{resetErrors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full btn-amber-glow mt-4 gap-2" size="lg" disabled={isSubmittingReset}>
            {isSubmittingReset ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Resetting Password...</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Verify OTP & Reset Password</>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // Step 1: Request OTP by Email
  return (
    <div className="card-surface p-8">
      <form onSubmit={handleSubmitEmail(onSendOtp)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="fp-email" className="text-sm font-medium text-foreground">
            Account Email Address
          </label>
          <input
            id="fp-email"
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
          <span>A 6-digit verification OTP code will be sent to your email address to authenticate your password reset.</span>
        </div>

        <Button type="submit" className="w-full btn-amber-glow" size="lg" disabled={isSubmittingEmail}>
          {isSubmittingEmail ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending Verification Code...</>
          ) : (
            "Send Reset OTP Code"
          )}
        </Button>
      </form>
    </div>
  );
}
