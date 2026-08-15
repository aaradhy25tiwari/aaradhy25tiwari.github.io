"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api/client";

interface RazorpayButtonProps {
  planId: string;
  planName: string;
  amount: number; // in INR
  onSuccess?: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function RazorpayButton({ planId, planName, amount, onSuccess }: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      setError("Payment gateway failed to load. Please try again.");
      setLoading(false);
      return;
    }

    try {
      // 1. Create Razorpay order on backend
      const { data: order } = await apiClient.post<{
        order_id: string;
        amount: number;
        currency: string;
        key_id: string;
        subscription_id?: string;
      }>("/subscriptions/create-order", { plan_id: planId });

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: order.key_id ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency ?? "INR",
        name: "InfraQuip",
        description: `${planName} Subscription`,
        order_id: order.order_id,
        subscription_id: order.subscription_id,
        image: "/logo.png",
        theme: { color: "#f59e0b" },
        handler: async (response: Record<string, string>) => {
          try {
            // 3. Verify payment on backend
            await apiClient.post("/subscriptions/verify-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            });
            onSuccess?.();
          } catch {
            setError("Payment verification failed. Contact support if amount was deducted.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        prefill: {
          // These will be filled by backend if available
        },
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate payment.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={loading}
        className="w-full btn-amber-glow gap-2"
        size="lg"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
        ) : (
          <><CreditCard className="h-4 w-4" />Pay ₹{amount.toLocaleString("en-IN")}</>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
