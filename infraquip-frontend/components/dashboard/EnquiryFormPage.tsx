"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send, CheckCircle, ArrowLeft } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Machine } from "@/types/machine";

const schema = z.object({
  requirement_type: z.enum(["rent", "buy"]),
  customer_company: z.string().max(300).optional(),
  required_from: z.string().optional(),
  required_duration_days: z.string().optional(),
  location_of_use: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

export function EnquiryFormPage({ machineId }: { machineId: string }) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const { data: machine, isLoading } = useQuery<Machine>({
    queryKey: ["machine", machineId],
    queryFn: async () => {
      const { data } = await apiClient.get<Machine>(`/machines/${machineId}`);
      return data;
    },
    enabled: !!machineId,
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { requirement_type: "rent" },
  });

  const reqType = watch("requirement_type");

  const mutation = useMutation({
    mutationFn: async (payload: FormData) => {
      await apiClient.post("/enquiries", {
        ...payload,
        machine_id: machineId,
        vendor_id: machine?.vendor?.id,
      });
    },
    onSuccess: () => {
      setSuccess(true);
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  if (isLoading) {
    return (
      <div className="section-container flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="section-container py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">Enquiry Sent!</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Your enquiry has been sent to the vendor. They will typically respond within 24 hours.
            You can track the status in your dashboard.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => router.push("/dashboard/customer/enquiries")} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              View My Enquiries
            </button>
            <button onClick={() => router.push("/machines")} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted">
              Browse More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container py-8">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {machine && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {machine.images?.[0]?.display_url ? (
                <img src={machine.images[0].display_url} alt={machine.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No img</div>
              )}
            </div>
            <div>
              <p className="font-semibold">{machine.title}</p>
              <p className="text-sm text-muted-foreground">{machine.make} &middot; {machine.model} &middot; {machine.city}</p>
              {machine.rental_price_daily && (
                <p className="text-sm font-semibold text-primary">{formatINR(machine.rental_price_daily)}/day</p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold">Send Enquiry</h1>
          <p className="mt-2 text-sm text-muted-foreground">Fill in the details below and the vendor will get back to you.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">I want to</label>
              <div className="flex gap-2">
                {["rent", "buy"].map((type) => (
                  <label key={type} className={cn(
                    "flex-1 cursor-pointer rounded-xl border p-3 text-center text-sm font-medium transition",
                    reqType === type ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}>
                    <input type="radio" value={type} {...register("requirement_type")} className="sr-only" />
                    {type === "rent" ? "Rent" : "Buy"}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="customer_company" className="text-sm font-medium">Company Name (optional)</label>
              <input id="customer_company" {...register("customer_company")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="required_from" className="text-sm font-medium">Required From</label>
                <input id="required_from" type="date" {...register("required_from")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              {reqType === "rent" && (
                <div className="space-y-2">
                  <label htmlFor="required_duration_days" className="text-sm font-medium">Duration (days)</label>
                  <input id="required_duration_days" type="number" min={1} {...register("required_duration_days")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="location_of_use" className="text-sm font-medium">Location of Use (optional)</label>
              <input id="location_of_use" {...register("location_of_use")} placeholder="City or project site address" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">Message (optional)</label>
              <textarea id="message" rows={4} {...register("message")} placeholder="Describe your requirement, timeline, or any specific questions..." className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            {mutation.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {mutation.error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting || mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Enquiry</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
