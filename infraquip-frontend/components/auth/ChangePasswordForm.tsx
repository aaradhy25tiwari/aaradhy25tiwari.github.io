"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, CheckCircle, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api/client";
import { getSupabaseClient } from "@/lib/supabase/client";

// ── Schema ─────────────────────────────────────────────────────
const schema = z
  .object({
    new_password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

// ── Strength checker ───────────────────────────────────────────
function StrengthItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs transition-colors", ok ? "text-emerald-500" : "text-muted-foreground")}>
      <div className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", ok ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      {label}
    </div>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const pwd = watch("new_password") ?? "";
  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    different: pwd.length > 0,
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/change-password", {
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });

      setDone(true);

      // Determine role from Supabase session metadata
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role ?? "customer";

      setTimeout(() => {
        router.replace(
          role === "vendor" ? "/dashboard/vendor"
          : role === "broker" ? "/dashboard/broker"
          : "/dashboard/customer"
        );
      }, 2000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to update password.");
    }
  };

  // ── Success ───────────────────────────────────────────────────
  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="font-bold text-xl">Password updated!</h2>
        <p className="text-muted-foreground text-sm">Redirecting you to your dashboard…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-600 dark:text-amber-400">
          You're using a <strong>temporary password</strong>. You must set a new password
          before you can use InfraQuip.
        </p>
      </div>

      {/* New password */}
      <div className="space-y-1.5">
        <label htmlFor="new_password" className="text-sm font-medium">New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="new_password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("new_password")}
            className={cn(
              "w-full rounded-xl border bg-background pl-10 pr-12 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary",
              errors.new_password ? "border-destructive" : "border-border"
            )}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Strength indicators */}
        <div className="grid grid-cols-2 gap-1 pt-1">
          <StrengthItem ok={checks.length} label="8+ characters" />
          <StrengthItem ok={checks.upper} label="Uppercase letter" />
          <StrengthItem ok={checks.number} label="Number" />
          <StrengthItem ok={checks.different} label="Not empty" />
        </div>
        {errors.new_password && (
          <p className="text-xs text-destructive">{errors.new_password.message}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <label htmlFor="confirm_password" className="text-sm font-medium">Confirm New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="confirm_password"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirm_password")}
            className={cn(
              "w-full rounded-xl border bg-background pl-10 pr-12 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary",
              errors.confirm_password ? "border-destructive" : "border-border"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full btn-amber-glow" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Updating password…</>
        ) : (
          "Set New Password & Continue"
        )}
      </Button>
    </form>
  );
}
