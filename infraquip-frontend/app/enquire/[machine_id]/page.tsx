import type { Metadata } from "next";
import { EnquiryFormPage } from "@/components/dashboard/EnquiryFormPage";

export const metadata: Metadata = {
  title: "Send Enquiry | InfraQuip",
  description: "Send a rental or purchase enquiry to a verified equipment vendor.",
};

export default async function Page({ params }: { params: Promise<{ machine_id: string }> }) {
  const resolvedParams = await params;
  return <EnquiryFormPage machineId={resolvedParams.machine_id} />;
}
