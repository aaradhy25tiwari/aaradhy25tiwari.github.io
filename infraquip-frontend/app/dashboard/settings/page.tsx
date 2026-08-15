"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import apiClient from "@/lib/api/client";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
});

const brokerSchema = z.object({
  company_name: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  description: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type BrokerData = z.infer<typeof brokerSchema>;

export default function SettingsPage() {
  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/me");
      return data;
    },
  });

  const user = profileQuery.data;
  const isBroker = user?.role === "broker";

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: profileQuery.data
      ? {
          full_name: profileQuery.data.full_name ?? "",
          phone: profileQuery.data.phone ?? "",
          company_name: profileQuery.data.company_name ?? "",
        }
      : undefined,
  });

  const brokerForm = useForm<BrokerData>({
    resolver: zodResolver(brokerSchema),
    values: isBroker && profileQuery.data?.broker_profile
      ? {
          company_name: profileQuery.data.broker_profile.company_name ?? "",
          gstin: profileQuery.data.broker_profile.gstin ?? "",
          pan: profileQuery.data.broker_profile.pan ?? "",
          city: profileQuery.data.broker_profile.city ?? "",
          state: profileQuery.data.broker_profile.state ?? "",
          description: profileQuery.data.broker_profile.description ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (payload: ProfileData) => {
      await apiClient.put("/auth/me", payload);
    },
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const brokerMutation = useMutation({
    mutationFn: async (payload: BrokerData) => {
      await apiClient.put("/auth/me/broker-profile", payload);
    },
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const onSubmit = (data: ProfileData) => mutation.mutate(data);
  const onBrokerSubmit = (data: BrokerData) => brokerMutation.mutate(data);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your profile and preferences.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-8">
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
          <input id="full_name" {...register("full_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
          <input id="phone" type="tel" {...register("phone")} placeholder="+91 98765 43210" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="space-y-2">
          <label htmlFor="company_name" className="text-sm font-medium">Company Name</label>
          <input id="company_name" {...register("company_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>

        {mutation.error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {mutation.error.message}
          </div>
        )}

        {mutation.isSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
            Profile updated successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting || mutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
        </button>
      </form>

      {isBroker && (
        <form onSubmit={brokerForm.handleSubmit(onBrokerSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-8">
          <div>
            <h2 className="text-lg font-semibold">Broker Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your brokerage details shown to vendors and customers.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="broker_company" className="text-sm font-medium">Company / Firm Name</label>
              <input id="broker_company" {...brokerForm.register("company_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-2">
              <label htmlFor="broker_city" className="text-sm font-medium">City</label>
              <input id="broker_city" {...brokerForm.register("city")} placeholder="Pune" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-2">
              <label htmlFor="broker_state" className="text-sm font-medium">State</label>
              <input id="broker_state" {...brokerForm.register("state")} placeholder="Maharashtra" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-2">
              <label htmlFor="broker_gstin" className="text-sm font-medium">GSTIN</label>
              <input id="broker_gstin" {...brokerForm.register("gstin")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="space-y-2">
              <label htmlFor="broker_pan" className="text-sm font-medium">PAN</label>
              <input id="broker_pan" {...brokerForm.register("pan")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="broker_description" className="text-sm font-medium">Description</label>
            <textarea
              id="broker_description"
              rows={3}
              {...brokerForm.register("description")}
              placeholder="e.g. Specialising in excavators and cranes for highway projects across Maharashtra..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {brokerMutation.error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {brokerMutation.error.message}
            </div>
          )}

          {brokerMutation.isSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
              Broker profile updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={brokerForm.formState.isSubmitting || brokerMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {brokerForm.formState.isSubmitting || brokerMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4" /> Save Broker Profile</>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
