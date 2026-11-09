"use client";

import Link from "next/link";
import { 
  Fuel, UserCheck, Clock, Truck, Home, Wrench, Shield, 
  FileText, Lock, CheckCircle2, AlertCircle, Banknote, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RentalTermSheet, SaleTermSheet } from "@/types/machine";
import { formatINR } from "@/lib/utils";

interface DetailedTermSheetProps {
  slug: string;
  listingType: "rent" | "sale" | "both";
  rentalTerms?: RentalTermSheet | null;
  saleTerms?: SaleTermSheet | null;
  isLocked?: boolean;
}

export function DetailedTermSheet({
  slug,
  listingType,
  rentalTerms,
  saleTerms,
  isLocked = false,
}: DetailedTermSheetProps) {
  const isRent = listingType === "rent" || listingType === "both";
  const isSale = listingType === "sale";

  if (isLocked) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-card p-6 shadow-sm">
        {/* Background preview blurred */}
        <div className="filter blur-sm select-none opacity-40 pointer-events-none space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">Fuel Scope</p>
              <p className="font-semibold text-sm">Fuel Included (Wet Lease)</p>
            </div>
            <div className="p-3 bg-muted rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">Operators</p>
              <p className="font-semibold text-sm">1 Certified Operator</p>
            </div>
            <div className="p-3 bg-muted rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">Standard Shift</p>
              <p className="font-semibold text-sm">8 Hours / Day</p>
            </div>
            <div className="p-3 bg-muted rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">Mobilization</p>
              <p className="font-semibold text-sm">Actuals / Distance Based</p>
            </div>
          </div>
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Commercial Term Sheet & Rate Scope
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
            Detailed rental terms (fuel scope, operator count, overtime rates, mobilization charges, and breakdown SLAs) are reserved for verified contractors and customers.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button size="sm" className="btn-amber-glow gap-1.5" asChild>
              <Link href={`/login?redirect=/machines/${slug}&action=view_terms`}>
                Sign In as Customer to View Terms
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/register?role=customer&redirect=/machines/${slug}`}>
                Create Free Account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If no term sheets configured at all
  if (!rentalTerms && !saleTerms) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="font-medium text-foreground">Standard Platform Terms Apply</p>
        <p className="text-xs text-muted-foreground mt-1">
          Detailed terms will be formalized during enquiry and quote generation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Rental Term Sheet ───────────────────────────────── */}
      {isRent && rentalTerms && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Equipment Rental Commercial Term Sheet
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard terms agreed by the vendor for project deployments
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Terms
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Fuel Scope */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Fuel className="h-4 w-4 text-primary" /> Fuel Scope
              </div>
              <p className="text-sm font-bold text-foreground">
                {rentalTerms.fuel_included ? "Wet Lease (Fuel Included)" : "Dry Lease (Fuel in Customer Scope)"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rentalTerms.fuel_included
                  ? "Standard operating diesel is provided by the vendor."
                  : "Customer supplies approved grade diesel at site."}
              </p>
            </div>

            {/* Operator Scope */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <UserCheck className="h-4 w-4 text-primary" /> Operators
              </div>
              <p className="text-sm font-bold text-foreground">
                {rentalTerms.operators_included
                  ? `${rentalTerms.operator_count || 1} Certified Operator(s) Included`
                  : "Customer Supplies Operator"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Shift: {rentalTerms.operator_shift_type?.replace(/_/g, " ") || "Standard 8 Hours"}
              </p>
            </div>

            {/* Working Hours & Overtime */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> Working Hours & Overtime
              </div>
              <p className="text-sm font-bold text-foreground">
                {rentalTerms.working_hours_per_day || 8} hrs/day ({rentalTerms.monthly_hours_limit || 208} hrs/mo)
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rentalTerms.overtime_rate_hourly
                  ? `Overtime: ₹${rentalTerms.overtime_rate_hourly}/hr`
                  : "Overtime: Pro-rata basis"}
              </p>
            </div>

            {/* Mobilization / Demobilization */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" /> Mobilization & Demob
              </div>
              <p className="text-sm font-bold text-foreground capitalize">
                {rentalTerms.mob_demob_type?.replace(/_/g, " ") || "Customer Actuals"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {rentalTerms.mob_demob_charge
                  ? `Flat charge: ₹${rentalTerms.mob_demob_charge.toLocaleString("en-IN")}`
                  : "Trailer transport charged at actuals from yard to site."}
              </p>
            </div>

            {/* Accommodation & Food */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Home className="h-4 w-4 text-primary" /> Operator Accommodation
              </div>
              <p className="text-sm font-bold text-foreground capitalize">
                {rentalTerms.operator_accommodation?.replace(/_/g, " ") || "Customer Provides at Site"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Food: {rentalTerms.operator_food?.replace(/_/g, " ") || "Customer scope"}
              </p>
            </div>

            {/* Maintenance & SLA */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Wrench className="h-4 w-4 text-primary" /> Maintenance & SLA
              </div>
              <p className="text-sm font-bold text-foreground">
                {rentalTerms.maintenance_sla_hours || 24}-Hour Repair SLA
              </p>
              <p className="text-[11px] text-muted-foreground">
                Idle hours deducted if breakdown exceeds SLA window.
              </p>
            </div>
          </div>

          {/* Deposit & Commercial Note */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 p-3.5 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 shrink-0" />
              <span>
                <strong>Deposit Terms:</strong> {rentalTerms.security_deposit_months || 1} Month Security Deposit + {rentalTerms.advance_rent_months || 1} Month Advance Rent upon mobilization.
              </span>
            </div>
          </div>

          {/* Special Terms Free Write */}
          {rentalTerms.special_terms && rentalTerms.special_terms.trim() && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-primary" /> Special Custom Conditions
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {rentalTerms.special_terms}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Sale Term Sheet ─────────────────────────────────── */}
      {isSale && saleTerms && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Equipment Sale & Title Term Sheet
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clearance status, inspection protocol, and transfer conditions
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Title Clear
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Hypothecation */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Hypothecation / Loan</p>
              <p className="text-sm font-bold text-foreground capitalize">
                {saleTerms.hypothecation_status?.replace(/_/g, " ") || "No Loan (Clean Title)"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Bank NOC provided upon token receipt.
              </p>
            </div>

            {/* RTO NOC */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">RTO NOC / Ownership Transfer</p>
              <p className="text-sm font-bold text-foreground capitalize">
                {saleTerms.rto_noc_responsibility?.replace(/_/g, " ") || "Vendor Provided"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                All clearance papers provided for re-registration.
              </p>
            </div>

            {/* Tax & GST */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Tax / GST Status</p>
              <p className="text-sm font-bold text-foreground capitalize">
                {saleTerms.tax_gst_status?.replace(/_/g, " ") || "18% GST Extra"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Tax invoice with GST input credit available.
              </p>
            </div>

            {/* Inspection */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Inspection Protocol</p>
              <p className="text-sm font-bold text-foreground">
                {saleTerms.inspection_allowed ? "Site Inspection Permitted" : "Sale As-Is"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {saleTerms.mechanic_check_allowed ? "Mechanic / Diagnostic check allowed" : "Visual inspection only"}
              </p>
            </div>

            {/* Health / Wear */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Component Health</p>
              <p className="text-sm font-bold text-foreground">
                {saleTerms.tyre_track_wear_percent != null ? `${saleTerms.tyre_track_wear_percent}% Life Remaining` : "Standard Condition"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Engine: {saleTerms.engine_condition || "Good"} • Hydraulics: {saleTerms.hydraulic_condition || "Normal"}
              </p>
            </div>

            {/* Payment Terms */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Payment Milestones</p>
              <p className="text-sm font-bold text-foreground">
                {saleTerms.token_deposit_percent || 10}% Token Advance
              </p>
              <p className="text-[11px] text-muted-foreground capitalize">
                Balance: {saleTerms.balance_payment_terms?.replace(/_/g, " ") || "On Inspection & Handover"}
              </p>
            </div>
          </div>

          {/* Special Terms Free Write */}
          {saleTerms.special_terms && saleTerms.special_terms.trim() && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-primary" /> Special Custom Conditions
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {saleTerms.special_terms}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

