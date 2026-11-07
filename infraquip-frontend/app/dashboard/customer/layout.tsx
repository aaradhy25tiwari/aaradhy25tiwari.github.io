import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerDashboardWrapper } from "@/components/dashboard/CustomerDashboardWrapper";

export const metadata: Metadata = {
  title: {
    default: "Customer Dashboard | InfraQuip",
    template: "%s | Customer Dashboard | InfraQuip",
  },
  description: "Manage your saved listings, enquiries, and preferences on InfraQuip.",
  robots: { index: false, follow: false },
};

export default async function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const role = user.user_metadata?.role || "customer";
  if (role !== "customer" && role !== "admin") {
    redirect(role === "admin" ? "/admin" : `/dashboard/${role}`);
  }

  return <CustomerDashboardWrapper>{children}</CustomerDashboardWrapper>;
}
