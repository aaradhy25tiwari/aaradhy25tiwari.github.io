import type { Metadata } from "next";
import { CustomerWishlistPage } from "@/components/dashboard/CustomerWishlistPage";

export const metadata: Metadata = {
  title: "Saved Listings",
  description: "View and manage your saved machine listings.",
};

export default function Page() {
  return <CustomerWishlistPage />;
}
