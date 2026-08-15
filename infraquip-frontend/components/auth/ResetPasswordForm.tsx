"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export function ResetPasswordForm() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch("password") ?? "";

  // Check for valid recovery session from Supabase email link
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, [supabase]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 3000);
  };

  if (hasSession === false) {
    return (
      <div className="card-surface p-8 text-center space-y-4">
        <p className="text-sm text-destructive font-medium">Invalid or expired reset link</p>
        <p className="text-xs text-muted-foreground">
          Please request a new password reset from the login page.
        </p>
        <Button asChild variant="outline" className="w-full">
          <a href="/forgot-password">Request new link</a>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card-surface p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="font-semibold text-lg">Password updated!</h2>
        <p className="text-sm text-muted-foreground">
          Your password has been changed successfully. Redirecting you to login…
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="rp-password" className="text-sm font-medium">
            New password
          </label>
          <div className="relative">
            <input
              id="rp-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
              className={cn(
                "w-full rounded-xl border bg-background px-4 py-3 pr-11 text-sm outline-none transition-all",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                errors.password ? "border-destructive" : "border-border"
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
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}

          {/* Strength checklist */}
          {password.length > 0 && (
            <ul className="mt-2 space-y-1">
              {requirements.map((req) => {
                const met = req.test(password);
                return (
                  <li key={req.label} className={cn("flex items-center gap-2 text-xs", met ? "text-emerald-500" : "text-muted-foreground")}>
                    <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", met ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                    {req.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="rp-confirm" className="text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="rp-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
            className={cn(
              "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              errors.confirmPassword ? "border-destructive" : "border-border"
            )}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full btn-amber-glow gap-2" size="lg" disabled={isSubmitting || hasSession === null}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Updating password…</>
          ) : (
            <><ShieldCheck className="h-4 w-4" />Set New Password</>
          )}
        </Button>
      </form>
    </div>
  );
}
