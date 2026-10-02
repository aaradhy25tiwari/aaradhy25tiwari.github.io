import { Suspense } from "react";
import type { Metadata } from "next";
import { VendorEnquiriesPage } from "@/components/dashboard/VendorEnquiriesPage";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Enquiries",
  description: "Review and respond to customer enquiries about your listings.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <VendorEnquiriesPage />
    </Suspense>
  );
}
