import type { Metadata } from "next";
import { EnquiryThreadClient } from "@/components/dashboard/EnquiryThreadClient";

export const metadata: Metadata = {
  title: "Enquiry Thread | Vendor Dashboard",
  description: "View and reply to customer enquiries.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EnquiryThreadClient enquiryId={resolvedParams.id} />;
}
