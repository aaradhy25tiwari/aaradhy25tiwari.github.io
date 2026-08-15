"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/machine";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  make: z.string().min(2, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year_of_manufacture: z.number().min(1990).max(2027),
  condition: z.enum(["new", "excellent", "good", "fair"]),
  category_id: z.string().uuid("Select a valid category"),
  capacity_specs: z.string().min(5, "Provide capacity details"),
  description: z.string().min(100, "Description must be at least 100 characters"),
  listing_type: z.enum(["rent", "sale", "both"]),
  min_rental_duration: z.enum(["1_day", "1_week", "1_month"]),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  rental_price_daily: z.number().optional(),
  purchase_price: z.number().optional(),
  contact_for_price: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function AddListingForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition: "good",
      listing_type: "rent",
      min_rental_duration: "1_day",
      contact_for_price: false,
    },
  });

  const contactForPrice = watch("contact_for_price");

  useEffect(() => {
    apiClient.get<Category[]>("/categories").then((response) => {
      setCategories(response.data);
    });
  }, []);

  const onSubmit = async (payload: FormData) => {
    setServerError(null);
    try {
      await apiClient.post("/vendor/listings", payload);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/vendor"), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to create listing.";
      setServerError(message);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle className="h-10 w-10" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">Listing submitted</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your machine is now pending admin review. You will be redirected to your dashboard shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-10">
      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="text-sm font-medium">Title</label>
            <input type="text" {...register("title")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.title ? "border-destructive" : "border-border")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Category</label>
            <select {...register("category_id")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.category_id ? "border-destructive" : "border-border")}> 
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Make</label>
            <input type="text" {...register("make")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.make ? "border-destructive" : "border-border")} />
            {errors.make && <p className="text-xs text-destructive">{errors.make.message}</p>}
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Model</label>
            <input type="text" {...register("model")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.model ? "border-destructive" : "border-border")} />
            {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <label className="text-sm font-medium">Year</label>
            <input type="number" {...register("year_of_manufacture", { valueAsNumber: true })} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.year_of_manufacture ? "border-destructive" : "border-border")} />
            {errors.year_of_manufacture && <p className="text-xs text-destructive">{errors.year_of_manufacture.message}</p>}
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Condition</label>
            <select {...register("condition")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.condition ? "border-destructive" : "border-border")}>
              <option value="new">New</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
            {errors.condition && <p className="text-xs text-destructive">{errors.condition.message}</p>}
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Listing type</label>
            <select {...register("listing_type")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.listing_type ? "border-destructive" : "border-border")}>
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
              <option value="both">Rent & sale</option>
            </select>
            {errors.listing_type && <p className="text-xs text-destructive">{errors.listing_type.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="text-sm font-medium">Minimum rental duration</label>
            <select {...register("min_rental_duration")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.min_rental_duration ? "border-destructive" : "border-border")}>
              <option value="1_day">1 day</option>
              <option value="1_week">1 week</option>
              <option value="1_month">1 month</option>
            </select>
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Capacity specs</label>
            <input type="text" {...register("capacity_specs")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.capacity_specs ? "border-destructive" : "border-border")} />
            {errors.capacity_specs && <p className="text-xs text-destructive">{errors.capacity_specs.message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Description</label>
          <textarea rows={6} {...register("description")} className={cn("w-full rounded-3xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.description ? "border-destructive" : "border-border")} />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="text-sm font-medium">City</label>
            <input type="text" {...register("city")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.city ? "border-destructive" : "border-border")} />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">State</label>
            <input type="text" {...register("state")} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.state ? "border-destructive" : "border-border")} />
            {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="text-sm font-medium">Daily rental price</label>
            <input type="number" step="0.01" {...register("rental_price_daily", { valueAsNumber: true })} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.rental_price_daily ? "border-destructive" : "border-border")} />
          </div>
          <div className="space-y-4">
            <label className="text-sm font-medium">Purchase price</label>
            <input type="number" step="0.01" {...register("purchase_price", { valueAsNumber: true })} className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary", errors.purchase_price ? "border-destructive" : "border-border")} />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-3xl border border-border bg-muted px-4 py-4 text-sm">
          <input id="contact_for_price" type="checkbox" {...register("contact_for_price")} className="h-4 w-4 rounded border-border accent-primary" />
          <label htmlFor="contact_for_price" className="text-sm font-medium">Contact for price</label>
          <span className="text-muted-foreground">Mark this if the price is available on request.</span>
        </div>

        {serverError && (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{serverError}</div>
        )}

        <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating listing...</> : "Submit listing for review"}
        </Button>
      </form>
    </div>
  );
}
