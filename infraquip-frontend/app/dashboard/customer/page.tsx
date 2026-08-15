import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";

export const metadata: Metadata = {
  title: "Customer Dashboard | InfraQuip",
  description: "Track your saved listings, enquiries, and customer activity on InfraQuip.",
};

export default function CustomerDashboardPage() {
  return <CustomerDashboard />;
}
