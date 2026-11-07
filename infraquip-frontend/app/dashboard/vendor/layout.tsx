import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendorDashboardWrapper } from "@/components/dashboard/VendorDashboardWrapper";
import { getTrustedUserRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: {
    default: "Vendor Dashboard | InfraQuip",
    template: "%s | Vendor Dashboard | InfraQuip",
  },
  description: "Manage your machine listings, enquiries, and subscription on InfraQuip.",
  robots: { index: false, follow: false },
};

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const role = await getTrustedUserRole(supabase, user);
  if (role !== "vendor" && role !== "admin") {
    redirect(`/dashboard/${role}`);
  }

  return <VendorDashboardWrapper>{children}</VendorDashboardWrapper>;
}
