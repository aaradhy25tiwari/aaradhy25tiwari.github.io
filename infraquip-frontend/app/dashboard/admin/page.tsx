import { redirect } from "next/navigation";

export default function DashboardAdminFallbackPage() {
  redirect("/admin");
}
