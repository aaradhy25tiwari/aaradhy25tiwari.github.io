import type { Metadata } from "next";
import { AdminAnalyticsPage } from "@/components/dashboard/AdminAnalyticsPage";

export const metadata: Metadata = {
  title: "Analytics | InfraQuip Admin",
  description: "Platform-wide analytics and trends.",
};

export default function Page() {
  return <AdminAnalyticsPage />;
}
