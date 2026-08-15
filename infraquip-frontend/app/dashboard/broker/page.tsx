import type { Metadata } from "next";
import { BrokerDashboard } from "@/components/dashboard/BrokerDashboard";

export const metadata: Metadata = {
  title: "Broker Dashboard | InfraQuip",
  description: "Manage your saved listings, enquiries, and broker activity on InfraQuip.",
};

export default function BrokerDashboardPage() {
  return <BrokerDashboard />;
}
