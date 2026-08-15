"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Building2, HardHat, Handshake, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import apiClient from "@/lib/api/client";

const schema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  phone: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;
type Role = "vendor" | "customer" | "broker";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();

  const defaultRole = (searchParams.get("role") as Role) || "customer";
  const [role, setRole] = useState<Role>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/register", { ...data, role });
      setSuccess(true);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="card-surface p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="font-semibold text-xl">Account created! 🎉</h2>
        <p className="text-muted-foreground text-sm">
          Check your inbox for a verification email. Once confirmed, you can{" "}
          {role === "vendor" ? "list your first machine." : "start browsing equipment."}
        </p>
        <Button className="w-full btn-amber-glow" onClick={() => router.push("/login")}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="card-surface p-8">
      {/* Role Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["vendor", "customer", "broker"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all",
              role === r
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
            )}
          >
            {r === "vendor" ? (
              <HardHat className="h-6 w-6" />
            ) : r === "broker" ? (
              <Handshake className="h-6 w-6" />
            ) : (
              <Building2 className="h-6 w-6" />
            )}
            {r === "vendor" ? "I'm a Vendor" : r === "broker" ? "I'm a Broker" : "Looking for equipment"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Rajesh Sharma"
            {...register("full_name")}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.full_name ? "border-destructive" : "border-border"}`}
          />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="text-sm font-medium">Email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.email ? "border-destructive" : "border-border"}`}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Phone (optional) */}
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            {...register("phone")}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-sm font-medium">Password</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password")}
              className={`w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.password ? "border-destructive" : "border-border"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          <p className="text-xs text-muted-foreground">Min 8 chars, 1 uppercase, 1 number</p>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full btn-amber-glow" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
          ) : (
            `Create ${role === "vendor" ? "Vendor" : role === "broker" ? "Broker" : "Customer"} Account`
          )}
        </Button>
      </form>
    </div>
  );
}
