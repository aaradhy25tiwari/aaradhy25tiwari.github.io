import type { Metadata } from "next";
import { VendorDashboard } from "@/components/dashboard/VendorDashboard";

export const metadata: Metadata = {
  title: "Vendor Dashboard | InfraQuip",
  description: "Manage your machine listings, enquiries, and subscription from the InfraQuip vendor dashboard.",
};

export default function VendorDashboardPage() {
  return <VendorDashboard />;
}
