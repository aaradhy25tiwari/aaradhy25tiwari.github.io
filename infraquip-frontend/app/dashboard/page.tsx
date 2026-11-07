import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrustedUserRole } from "@/lib/auth/roles";

export default async function DashboardRootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }
  const role = await getTrustedUserRole(supabase, user);
  if (role === "admin") {
    redirect("/admin");
  }
  redirect(`/dashboard/${role}`);
}
