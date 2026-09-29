import { redirect } from "next/navigation";

export default function DashboardRootPage() {
  // Default fallback redirect to vendor dashboard
  redirect("/dashboard/vendor");
}
