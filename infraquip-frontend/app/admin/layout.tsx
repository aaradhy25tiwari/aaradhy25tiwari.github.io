import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardWrapper } from "@/components/dashboard/AdminDashboardWrapper";
import { getTrustedUserRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: {
    default: "Admin Panel | InfraQuip",
    template: "%s | Admin Panel | InfraQuip",
  },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const role = await getTrustedUserRole(supabase, user);
  if (role !== "admin") {
    redirect(`/dashboard/${role}`);
  }

  return <AdminDashboardWrapper>{children}</AdminDashboardWrapper>;
}
