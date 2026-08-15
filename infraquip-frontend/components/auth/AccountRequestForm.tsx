"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  HardHat, Building2, Handshake, CheckCircle, CheckCircle2, Loader2, User,
  Phone, MapPin, FileText, MessageSquare, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api/client";

// ── Schema ────────────────────────────────────────────────────
const schema = z.object({
  full_name: z.string().min(2, "Full name required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
  company_name: z.string().min(2, "Company / firm name required"),
  city: z.string().min(2, "City is required"),
  gstin_pan: z.string().optional(),
  message: z.string().min(10, "Please describe your requirement (min 10 chars)"),
});

type FormData = z.infer<typeof schema>;
type Role = "vendor" | "customer" | "broker";

// ── Field wrapper ─────────────────────────────────────────────
function Field({
  label, error, children, hint,
}: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary",
    err ? "border-destructive" : "border-border"
  );

// ── Component ─────────────────────────────────────────────────
export function AccountRequestForm() {
  const [role, setRole] = useState<Role>("vendor");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await apiClient.post("/account-requests", { ...data, role });
      setSubmitted(true);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="card-surface p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
        </div>
        <div>
          <h2 className="font-bold text-xl mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We've received your access request and will review it within{" "}
            <span className="font-semibold text-foreground">24 hours</span>.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400 text-left">
          <p className="font-semibold mb-1">📧 Check your email</p>
          <p>
            Once approved, you'll receive an email with your{" "}
            <span className="font-semibold">temporary login credentials</span>. You'll
            be asked to set a new password on your first login.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Questions? Contact us at{" "}
          <a href="mailto:support@infraquip.in" className="text-primary hover:underline">
            support@infraquip.in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-8">
      {/* Role selector */}
      <div className="mb-10">
        <p className="mb-6 text-sm font-semibold text-foreground text-center">
          What kind of account do you want to create?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["vendor", "customer", "broker"] as Role[]).map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => setRole(r)}
                className={cn(
                  "relative flex flex-col items-center rounded-2xl p-5 text-center transition-all min-h-[16rem]",
                  active
                    ? "border-2 border-emerald-500 bg-emerald-500/5 text-emerald-500"
                    : "border border-border/50 bg-card text-muted-foreground hover:border-emerald-500/40 hover:bg-muted/40"
                )}
              >
                {/* Checkmark for active state */}
                {active && (
                  <span className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-bl-xl rounded-tr-[14px] bg-emerald-600 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
                {!active && (
                  <span className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-bl-xl rounded-tr-[14px] bg-border/40 text-muted-foreground/30">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}

                {/* Top Title */}
                <span className={cn("text-base font-bold mb-auto mt-2", active ? "text-emerald-500" : "text-foreground")}>
                  {r === "vendor" ? "Vendor" : r === "broker" ? "Broker" : "Customer"}
                </span>

                {/* Center Icon */}
                <div
                  className={cn(
                    "my-6 flex items-center justify-center transition-all",
                    active ? "text-emerald-500 scale-110" : "text-muted-foreground opacity-60 grayscale"
                  )}
                >
                  {r === "vendor" ? (
                    <HardHat className="h-16 w-16" strokeWidth={1.5} />
                  ) : r === "broker" ? (
                    <Handshake className="h-16 w-16" strokeWidth={1.5} />
                  ) : (
                    <Building2 className="h-16 w-16" strokeWidth={1.5} />
                  )}
                </div>

                {/* Bottom Description */}
                <span className="text-xs leading-relaxed opacity-80 mt-auto px-1">
                  {r === "vendor"
                    ? "Post an equipment as a vendor"
                    : r === "broker"
                    ? "Source machinery and match lease leads for infrastructure projects."
                    : "Look for equipments as a customer"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full name */}
        <Field label="Full Name" error={errors.full_name?.message}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              autoComplete="name"
              placeholder="Rajesh Sharma"
              {...register("full_name")}
              className={cn(inputCls(errors.full_name?.message), "pl-10")}
            />
          </div>
        </Field>

        {/* Email */}
        <Field label="Work Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            className={inputCls(errors.email?.message)}
          />
        </Field>

        {/* Phone + City row */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" error={errors.phone?.message}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                {...register("phone")}
                className={cn(inputCls(errors.phone?.message), "pl-10")}
              />
            </div>
          </Field>
          <Field label="City" error={errors.city?.message}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pune"
                {...register("city")}
                className={cn(inputCls(errors.city?.message), "pl-10")}
              />
            </div>
          </Field>
        </div>

        {/* Company name */}
        <Field label="Company / Firm Name" error={errors.company_name?.message}>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Sharma Construction Pvt. Ltd."
              {...register("company_name")}
              className={cn(inputCls(errors.company_name?.message), "pl-10")}
            />
          </div>
        </Field>

        {/* GSTIN / PAN (optional) */}
        <Field
          label="GSTIN / PAN"
          error={errors.gstin_pan?.message}
          hint="Optional — helps us verify your business faster"
        >
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="27AABCU9603R1ZX or AABCU9603R"
              {...register("gstin_pan")}
              className={cn(inputCls(), "pl-10")}
            />
          </div>
        </Field>

        {/* Message */}
        <Field
          label={role === "vendor" ? "Tell us about your fleet" : role === "broker" ? "Tell us about your brokerage" : "What equipment do you need?"}
          error={errors.message?.message}
          hint="A brief description helps us approve your account faster"
        >
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <textarea
              rows={3}
              placeholder={
                role === "vendor"
                  ? "e.g. I own 3 JCB excavators and 2 cranes available for rent in Pune region..."
                  : role === "broker"
                    ? "e.g. I broker excavators and cranes for highway projects across Maharashtra..."
                    : "e.g. Looking to rent excavators and loaders for a 6-month highway project in Maharashtra..."
              }
              {...register("message")}
              className={cn(
                "w-full rounded-xl border bg-background pl-10 pr-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none",
                errors.message ? "border-destructive" : "border-border"
              )}
            />
          </div>
        </Field>

        {/* Server error */}
        {serverError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
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
            <><Loader2 className="h-4 w-4 animate-spin" />Submitting request…</>
          ) : (
            `Request ${role === "vendor" ? "Vendor" : role === "broker" ? "Broker" : "Customer"} Account`
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-1">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline font-medium">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
