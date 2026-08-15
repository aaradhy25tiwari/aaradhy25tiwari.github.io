import type { Metadata } from "next";
import { CustomerEnquiriesPage } from "@/components/dashboard/CustomerEnquiriesPage";

export const metadata: Metadata = {
  title: "My Enquiries",
  description: "Track the status of all your equipment enquiries.",
};

export default function Page() {
  return <CustomerEnquiriesPage />;
}
