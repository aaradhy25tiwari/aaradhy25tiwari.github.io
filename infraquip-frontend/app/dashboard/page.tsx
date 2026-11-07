import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }
  const role = user.user_metadata?.role || "customer";
  if (role === "admin") {
    redirect("/admin");
  }
  redirect(`/dashboard/${role}`);
}
