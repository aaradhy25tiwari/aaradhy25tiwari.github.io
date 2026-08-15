import type { Metadata } from "next";
import { AdminRequestsPage } from "@/components/dashboard/AdminRequestsPage";

export const metadata: Metadata = {
  title: "Account Requests — Admin",
  robots: { index: false, follow: false },
};

export default function AdminRequestsRoute() {
  return <AdminRequestsPage />;
}
