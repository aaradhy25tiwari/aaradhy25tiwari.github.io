import type { Metadata } from "next";
import { BrokerDashboardWrapper } from "@/components/dashboard/BrokerDashboardWrapper";

export const metadata: Metadata = {
  title: {
    default: "Broker Dashboard | InfraQuip",
    template: "%s | Broker Dashboard | InfraQuip",
  },
  description: "Manage your saved listings, enquiries, and preferences on InfraQuip.",
  robots: { index: false, follow: false },
};

export default function BrokerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <BrokerDashboardWrapper>{children}</BrokerDashboardWrapper>;
}
