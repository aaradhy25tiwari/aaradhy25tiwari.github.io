import { Suspense } from "react";
import type { Metadata } from "next";
import { BuyEquipmentPage } from "@/components/buy/BuyEquipmentPage";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Buy Heavy Equipment & Machinery | Certified Inspections & Financing | InfraQuip",
  description:
    "Source certified pre-owned and new heavy machinery across India with InfraQuip. 100+ point inspection, verified titles, RTO NOC, and asset financing up to 80%.",
  openGraph: {
    title: "Buy Heavy Equipment — Certified Pre-Owned & New Machinery | InfraQuip",
    description:
      "Looking to buy excavators, cranes, backhoes, or compactors? Submit your equipment procurement request to InfraQuip's dedicated machinery sourcing desk.",
  },
};

function LoadingFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm">Loading Equipment Sourcing Desk...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BuyEquipmentPage />
    </Suspense>
  );
}
