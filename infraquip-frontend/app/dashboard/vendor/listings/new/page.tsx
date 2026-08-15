import type { Metadata } from "next";
import { ListingForm } from "@/components/dashboard/ListingForm";

export const metadata: Metadata = {
  title: "Add Machine Listing | InfraQuip",
  description: "Create a new machine listing for review and approval on InfraQuip.",
};

export default function NewListingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add New Machine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below. Your listing will be reviewed within 24 hours.
        </p>
      </div>
      <ListingForm />
    </div>
  );
}
