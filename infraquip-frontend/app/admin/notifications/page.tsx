import type { Metadata } from "next";
import { NotificationsPage } from "@/components/dashboard/NotificationsPage";

export const metadata: Metadata = {
  title: "All Notifications | InfraQuip",
  description: "View all platform notifications.",
};

export default function Page() {
  return <NotificationsPage />;
}
