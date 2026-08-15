"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, CheckCircle, Shield, Zap, TrendingUp, Download, Bell, Star, Crown } from "lucide-react";
import apiClient from "@/lib/api/client";
import { cn, formatINR } from "@/lib/utils";

interface PlanResponse {
  id: string;
  plan_code: string;
  name: string;
  role: string;
  price_monthly: number;
  active_listing_limit: number | null;
  photos_per_listing: number;
  enquiry_limit_monthly: number | null;
  wishlist_limit: number | null;
  has_featured_boost: boolean;
  has_full_analytics: boolean;
  has_export: boolean;
  has_daily_digest: boolean;
  has_bulk_rfq: boolean;
  has_priority_badge: boolean;
  has_spec_download: boolean;
  verified_badge_eligible: boolean;
  razorpay_plan_id: string | null;
}

interface SubscriptionResponse {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  plan?: PlanResponse | null;
}

interface CreateOrderResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key: string;
  plan_name: string;
}

const featureIcons: Record<string, typeof CheckCircle> = {
  has_featured_boost: Zap,
  has_full_analytics: TrendingUp,
  has_export: Download,
  has_daily_digest: Bell,
  has_priority_badge: Star,
  has_spec_download: Download,
  verified_badge_eligible: Crown,
};

const featureLabels: Record<string, string> = {
  has_featured_boost: "Boosted search visibility",
  has_full_analytics: "Full analytics dashboard",
  has_export: "Export reports",
  has_daily_digest: "Daily email digest",
  has_bulk_rfq: "Bulk RFQ support",
  has_priority_badge: "Priority vendor badge",
  has_spec_download: "Spec sheet downloads",
  verified_badge_eligible: "Verified badge eligible",
};

export function SubscriptionPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plansData, isLoading: plansLoading } = useQuery<{ vendor_plans: PlanResponse[]; customer_plans: PlanResponse[] }>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await apiClient.get("/subscriptions/plans");
      return data;
    },
  });

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionResponse | null>({
    queryKey: ["vendor-subscription"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<SubscriptionResponse>("/subscriptions/my");
        return data;
      } catch {
        return null;
      }
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { data } = await apiClient.post<CreateOrderResponse>("/subscriptions/create-order", { plan_id: planId });
      return data;
    },
    onSuccess: (data) => {
      // Razorpay checkout would open here with data.razorpay_order_id, data.amount, data.key
      // For now, verify endpoint would be called after payment
      console.log("Order created:", data.razorpay_order_id);
    },
  });

  const plans = plansData?.vendor_plans ?? [];
  const hasActiveSub = subscription?.status === "active";
  const currentPlan = subscription?.plan;
  const maxListings = currentPlan?.active_listing_limit ?? 0;
  const usedListings = 0; // Would come from vendor stats

  if (plansLoading || subLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a plan to list your equipment and grow your business.</p>
      </div>

      {hasActiveSub && currentPlan && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-semibold">{currentPlan.name} Plan Active</p>
              <p className="text-sm text-muted-foreground">
                Valid until {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "---"}
                {maxListings > 0 && ` · ${usedListings}/${maxListings} listings used`}
              </p>
            </div>
          </div>
          {maxListings > 0 && (
            <div className="mt-4 h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(usedListings / maxListings) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isPopular = plan.plan_code === "vendor_pro";
          const isCurrent = subscription?.plan_id === plan.id;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 transition",
                isPopular ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/40",
                selectedPlanId === plan.id && "ring-2 ring-primary",
              )}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Popular
                </span>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-3xl font-bold">
                {formatINR(plan.price_monthly)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>

              <div className="mt-2 text-sm text-muted-foreground">
                {plan.active_listing_limit
                  ? `Up to ${plan.active_listing_limit} active listings`
                  : "Unlimited listings"}
                {` · ${plan.photos_per_listing} photos each`}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {Object.entries(featureLabels).map(([key, label]) => {
                  const enabled = (plan as any)[key];
                  const Icon = featureIcons[key] || CheckCircle;
                  return (
                    <li key={key} className={cn("flex items-start gap-2 text-sm", !enabled && "opacity-30")}>
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", enabled ? "text-emerald-500" : "text-muted-foreground")} />
                      {label}
                    </li>
                  );
                })}
              </ul>

              <button
                disabled={createOrderMutation.isPending && selectedPlanId === plan.id || isCurrent}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  createOrderMutation.mutate(plan.id);
                }}
                className={cn(
                  "mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition",
                  isPopular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background hover:bg-muted",
                  (createOrderMutation.isPending && selectedPlanId === plan.id) && "opacity-50",
                  isCurrent && "cursor-default opacity-50",
                )}
              >
                {createOrderMutation.isPending && selectedPlanId === plan.id ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span>
                ) : isCurrent ? (
                  "Current Plan"
                ) : hasActiveSub ? (
                  "Switch Plan"
                ) : (
                  "Subscribe"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Secure Payments via Razorpay</p>
            <p className="mt-1">All subscriptions are processed securely through Razorpay. UPI, credit/debit cards, and net banking accepted.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
