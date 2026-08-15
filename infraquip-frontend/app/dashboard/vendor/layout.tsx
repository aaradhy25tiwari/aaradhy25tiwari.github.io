import type { Metadata } from "next";
import { VendorDashboardWrapper } from "@/components/dashboard/VendorDashboardWrapper";

export const metadata: Metadata = {
  title: {
    default: "Vendor Dashboard | InfraQuip",
    template: "%s | Vendor Dashboard | InfraQuip",
  },
  description: "Manage your machine listings, enquiries, and subscription on InfraQuip.",
  robots: { index: false, follow: false },
};

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <VendorDashboardWrapper>{children}</VendorDashboardWrapper>;
}
