import type { Metadata } from "next";
import { CustomerDashboardWrapper } from "@/components/dashboard/CustomerDashboardWrapper";

export const metadata: Metadata = {
  title: {
    default: "Customer Dashboard | InfraQuip",
    template: "%s | Customer Dashboard | InfraQuip",
  },
  description: "Manage your saved listings, enquiries, and preferences on InfraQuip.",
  robots: { index: false, follow: false },
};

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <CustomerDashboardWrapper>{children}</CustomerDashboardWrapper>;
}
