import type { Metadata } from "next";
import { MachinesClientPage } from "@/components/machines/MachinesClientPage";

export const metadata: Metadata = {
  title: "Browse Construction Equipment — Excavators, Cranes, Forklifts & More",
  description:
    "Search and filter thousands of construction equipment listings across India. Find excavators, cranes, bulldozers, forklifts for rent or sale. Verified vendors. Instant enquiry.",
  openGraph: {
    title: "Browse Construction Equipment for Rent & Sale | InfraQuip",
    description:
      "India's largest B2B construction equipment marketplace. Compare prices, specs, and vendors near you.",
  },
};

export default function MachinesPage() {
  return <MachinesClientPage />;
}
