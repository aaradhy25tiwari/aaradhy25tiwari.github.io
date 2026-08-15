import type { Metadata } from "next";
import { NotificationsPage } from "@/components/dashboard/NotificationsPage";

export const metadata: Metadata = {
  title: "Notifications | InfraQuip",
  description: "View your recent notifications.",
};

export default function Page() {
  return <NotificationsPage />;
}
