import type { Metadata } from "next";
import { EnquiryDetailPage } from "@/components/dashboard/EnquiryDetailPage";

export const metadata: Metadata = {
  title: "Enquiry Details",
  description: "View your enquiry and communicate with the vendor.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EnquiryDetailPage enquiryId={resolvedParams.id} />;
}
