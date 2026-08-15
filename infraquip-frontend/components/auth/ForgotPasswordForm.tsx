"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const supabase = getSupabaseClient();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="card-surface p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="font-semibold text-lg">Check your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If an account exists for that email, we&apos;ve sent a password reset link.
          It may take a minute to arrive — also check your spam folder.
        </p>
        <div className="rounded-xl bg-muted/50 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 flex-shrink-0" />
          The link expires in 60 minutes.
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="fp-email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all
              focus:ring-2 focus:ring-primary/20 focus:border-primary
              ${errors.email ? "border-destructive" : "border-border"}`}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full btn-amber-glow" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Sending reset link...</>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>
    </div>
  );
}
