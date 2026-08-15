import type { Metadata } from "next";
import { VendorEnquiriesPage } from "@/components/dashboard/VendorEnquiriesPage";

export const metadata: Metadata = {
  title: "Enquiries",
  description: "Review and respond to customer enquiries about your listings.",
};

export default function Page() {
  return <VendorEnquiriesPage />;
}
