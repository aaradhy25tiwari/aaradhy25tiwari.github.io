import { Suspense } from "react";
import type { Metadata } from "next";
import { VendorListingsPage } from "@/components/dashboard/VendorListingsPage";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "My Listings",
  description: "Manage your machine listings — view, edit, pause, or delete.",
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
      <VendorListingsPage />
    </Suspense>
  );
}
