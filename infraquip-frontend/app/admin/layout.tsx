import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardWrapper } from "@/components/dashboard/AdminDashboardWrapper";

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

  const role = user.user_metadata?.role || "customer";
  if (role !== "admin") {
    redirect(`/dashboard/${role}`);
  }

  return <AdminDashboardWrapper>{children}</AdminDashboardWrapper>;
}
