import type { Metadata } from "next";
import { AdminOverviewPage } from "@/components/dashboard/AdminOverviewPage";

export const metadata: Metadata = {
  title: "Admin Dashboard | InfraQuip",
  description: "Platform overview and management.",
};

export default function Page() {
  return <AdminOverviewPage />;
}
