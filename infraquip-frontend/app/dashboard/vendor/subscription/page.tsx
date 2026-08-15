import type { Metadata } from "next";
import { SubscriptionPage } from "@/components/dashboard/SubscriptionPage";

export const metadata: Metadata = {
  title: "Subscription | InfraQuip Vendor",
  description: "Choose a plan to list your equipment on InfraQuip.",
};

export default function Page() {
  return <SubscriptionPage />;
}
