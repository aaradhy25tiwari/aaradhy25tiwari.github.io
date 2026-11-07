import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrokerDashboardWrapper } from "@/components/dashboard/BrokerDashboardWrapper";
import { getTrustedUserRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: {
    default: "Broker Dashboard | InfraQuip",
    template: "%s | Broker Dashboard | InfraQuip",
  },
  description: "Manage your saved listings, enquiries, and preferences on InfraQuip.",
  robots: { index: false, follow: false },
};

export default async function BrokerDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const role = await getTrustedUserRole(supabase, user);
  if (role !== "broker" && role !== "admin") {
    redirect(`/dashboard/${role}`);
  }

  return <BrokerDashboardWrapper>{children}</BrokerDashboardWrapper>;
}
