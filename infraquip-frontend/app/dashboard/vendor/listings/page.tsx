import type { Metadata } from "next";
import { VendorListingsPage } from "@/components/dashboard/VendorListingsPage";

export const metadata: Metadata = {
  title: "My Listings",
  description: "Manage your machine listings — view, edit, pause, or delete.",
};

export default function Page() {
  return <VendorListingsPage />;
}
