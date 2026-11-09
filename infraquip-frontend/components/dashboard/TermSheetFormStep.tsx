"use client";

import { useState } from "react";
import { 
  Fuel, Users, Clock, Truck, Home, Utensils, Wrench, 
  Shield, FileText, Copy, AlertTriangle, CheckCircle, ChevronDown, Check, Info
} from "lucide-react";
import type { RentalTermSheet, SaleTermSheet, ListingType } from "@/types/machine";
import { DEFAULT_RENTAL_TERMS, DEFAULT_SALE_TERMS } from "@/types/machine";
import { cn } from "@/lib/utils";

interface PreviousListingTerms {
  id: string;
  title: string;
  listing_type: string;
  rental_term_sheet?: RentalTermSheet | null;
  sale_term_sheet?: SaleTermSheet | null;
}

interface TermSheetFormStepProps {
  listingType: ListingType;
  rentalTerms: RentalTermSheet | null;
  setRentalTerms: React.Dispatch<React.SetStateAction<RentalTermSheet | null>>;
  saleTerms: SaleTermSheet | null;
  setSaleTerms: React.Dispatch<React.SetStateAction<SaleTermSheet | null>>;
  previousListings: PreviousListingTerms[];
}

export function TermSheetFormStep({
  listingType,
  rentalTerms: propRentalTerms,
  setRentalTerms,
  saleTerms: propSaleTerms,
  setSaleTerms,
  previousListings,
}: TermSheetFormStepProps) {
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);
  const [selectedPrevId, setSelectedPrevId] = useState<string>("");

  const rentalTerms = propRentalTerms || DEFAULT_RENTAL_TERMS;
  const saleTerms = propSaleTerms || DEFAULT_SALE_TERMS;

  const isRent = listingType === "rent" || listingType === "both";
  const isSale = listingType === "sale" || listingType === "both";

  const handleCopyPrevious = (id: string) => {
    setSelectedPrevId(id);
    if (!id) return;
    const match = previousListings.find((p) => p.id === id);
    if (!match) return;

    if (match.rental_term_sheet && isRent) {
      setRentalTerms(match.rental_term_sheet);
    }
    if (match.sale_term_sheet && isSale) {
      setSaleTerms(match.sale_term_sheet);
    }

    setCopySuccessMsg(`Copied term sheet from "${match.title}"`);
    setTimeout(() => setCopySuccessMsg(null), 3500);
  };

  const updateRental = <K extends keyof RentalTermSheet>(key: K, value: RentalTermSheet[K]) => {
    setRentalTerms((prev) => ({ ...(prev || DEFAULT_RENTAL_TERMS), [key]: value }));
  };

  const updateSale = <K extends keyof SaleTermSheet>(key: K, value: SaleTermSheet[K]) => {
    setSaleTerms((prev) => ({ ...(prev || DEFAULT_SALE_TERMS), [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Detailed Term Sheet</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Specify your standard commercial, operational, and maintenance clauses. Standardized term sheets set clear expectations, prevent payment disputes, and build customer trust.
        </p>
      </div>

      {/* Copy from Previous Listing Dropdown */}
      {previousListings.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Copy className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Save time with 1-Click Copy</p>
              <p className="text-[11px] text-muted-foreground">Duplicate terms from one of your existing listings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <select
                value={selectedPrevId}
                onChange={(e) => handleCopyPrevious(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-xs font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Choose previous listing...</option>
                {previousListings.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {copySuccessMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {copySuccessMsg}
        </div>
      )}

      {/* ── RENTAL TERM SHEET ── */}
      {isRent && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Rental Operation & Commercial Scope
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard terms applied to rental enquiries for this machine.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              For Rent
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Fuel Scope */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5 text-amber-500" /> Fuel Provision Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateRental("fuel_included", false)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition text-xs font-medium cursor-pointer",
                    !rentalTerms.fuel_included
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/20"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <p className="font-semibold">Excluded (Dry Lease)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Hirer provides diesel</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateRental("fuel_included", true)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition text-xs font-medium cursor-pointer",
                    rentalTerms.fuel_included
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/20"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <p className="font-semibold">Included (Wet Lease)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Vendor provides diesel</p>
                </button>
              </div>
            </div>

            {/* Operator Scope */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-500" /> Operator / Crew Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateRental("operators_included", true)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition text-xs font-medium cursor-pointer",
                    rentalTerms.operators_included
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/20"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <p className="font-semibold">Operator Included</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Certified driver provided</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateRental("operators_included", false)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition text-xs font-medium cursor-pointer",
                    !rentalTerms.operators_included
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/20"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <p className="font-semibold">Bare Machine Only</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Customer hires crew</p>
                </button>
              </div>
            </div>

            {/* Operator Shift & Count (if included) */}
            {rentalTerms.operators_included && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Operator Shift Arrangement</label>
                  <select
                    value={rentalTerms.operator_shift_type}
                    onChange={(e) => updateRental("operator_shift_type", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="single_shift_8h">Single Shift (8 Hours / Day)</option>
                    <option value="single_shift_10h">Single Shift (10 Hours / Day)</option>
                    <option value="double_shift_16h">Double Shift (16 Hours / 2 Operators)</option>
                    <option value="24h_continuous">Continuous 24 Hours (3 Operators)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Operator Accommodation on Site</label>
                  <select
                    value={rentalTerms.operator_accommodation}
                    onChange={(e) => updateRental("operator_accommodation", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="customer_provides">Customer provides room / labor camp</option>
                    <option value="vendor_provided">Vendor arranges / included in rate</option>
                    <option value="not_applicable">Not applicable (local operator)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Operator Food / Mess</label>
                  <select
                    value={rentalTerms.operator_food}
                    onChange={(e) => updateRental("operator_food", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="customer_provides">Customer provides food / mess</option>
                    <option value="vendor_provided">Vendor provides allowance / included</option>
                    <option value="not_applicable">Not applicable</option>
                  </select>
                </div>
              </>
            )}

            {/* Standard Shift Hours & Monthly Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Standard Working Hours / Day</label>
              <input
                type="number"
                min={1}
                max={24}
                value={rentalTerms.working_hours_per_day}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10);
                  const val = isNaN(raw) ? 8 : Math.max(1, Math.min(24, raw));
                  updateRental("working_hours_per_day", val);
                  updateRental("monthly_hours_limit", val * (rentalTerms.working_days_per_month || 26));
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">Standard billing hours per calendar working day</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Working Days / Month</label>
              <input
                type="number"
                min={1}
                max={31}
                value={rentalTerms.working_days_per_month}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10);
                  const days = isNaN(raw) ? 26 : Math.max(1, Math.min(31, raw));
                  updateRental("working_days_per_month", days);
                  updateRental("monthly_hours_limit", (rentalTerms.working_hours_per_day || 10) * days);
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">Typically 25 or 26 days (excluding 4 Sundays for servicing)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Overtime Hourly Rate (₹ / hr)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={rentalTerms.overtime_rate_hourly || ""}
                onChange={(e) => updateRental("overtime_rate_hourly", parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">Billed beyond standard daily working hours</p>
            </div>

            {/* Mobilization / Demobilization */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" /> Mobilization & Demobilization Charges
              </label>
              <select
                value={rentalTerms.mob_demob_type}
                onChange={(e) => updateRental("mob_demob_type", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="customer_actuals">Customer actuals (Customer books trailer/transport)</option>
                <option value="fixed_charge">Fixed lump-sum charge (both ways)</option>
                <option value="free_over_3months">Free mobilization for contracts &gt; 3 months</option>
              </select>
            </div>

            {rentalTerms.mob_demob_type === "fixed_charge" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Fixed Mob/Demob Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 25000"
                  value={rentalTerms.mob_demob_charge || ""}
                  onChange={(e) => updateRental("mob_demob_charge", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}

            {/* Maintenance Breakdown SLA */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-primary" /> Breakdown Resolution SLA
              </label>
              <select
                value={rentalTerms.maintenance_sla_hours}
                onChange={(e) => updateRental("maintenance_sla_hours", parseInt(e.target.value, 10) || 24)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value={12}>12 Hours (High priority response)</option>
                <option value={24}>24 Hours (Standard resolution)</option>
                <option value={48}>48 Hours (Replacement machine / pro-rata deduction)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">Time window to repair breakdown before downtime deduction applies</p>
            </div>

            {/* Advance & Security Deposit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-500" /> Security Deposit & Payment Terms
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    placeholder="Deposit (months)"
                    value={rentalTerms.security_deposit_months ?? 1}
                    onChange={(e) => updateRental("security_deposit_months", parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Months security deposit</span>
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    placeholder="Advance rent (months)"
                    value={rentalTerms.advance_rent_months ?? 1}
                    onChange={(e) => updateRental("advance_rent_months", parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Month(s) advance rent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Special Terms Free Write */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>Special Rental Clauses (Free Write)</span>
              </label>
              {rentalTerms.special_terms?.trim() && (
                <span className="text-[11px] font-medium text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" /> Requires Admin Review
                </span>
              )}
            </div>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="e.g. Minor tyre punctures to be borne by hirer; major hydraulic seals replaced by owner. 15-day demobilization notice required..."
              value={rentalTerms.special_terms || ""}
              onChange={(e) => updateRental("special_terms", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/50 resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              ⚠️ Note: Any custom free-text clauses will be checked by our review team before the listing is activated to maintain platform neutrality.
            </p>
          </div>
        </div>
      )}

      {/* ── SALE TERM SHEET ── */}
      {isSale && (
        <div className="rounded-3xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" /> Equipment Sale & Transfer Terms
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Title, hypothecation, inspection, and payment conditions for buyers.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              For Sale
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Hypothecation / Loan */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Hypothecation / Loan Status</label>
              <select
                value={saleTerms.hypothecation_status}
                onChange={(e) => updateSale("hypothecation_status", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="no_loan">Clear Title / No Active Loan</option>
                <option value="loan_active_vendor_clears">Active Loan (Vendor will clear loan & obtain bank NOC)</option>
                <option value="bank_noc_in_hand">Bank NOC Already In Hand</option>
              </select>
            </div>

            {/* RTO NOC Responsibility */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">RTO NOC & Title Transfer</label>
              <select
                value={saleTerms.rto_noc_responsibility}
                onChange={(e) => updateSale("rto_noc_responsibility", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="vendor_provided">Vendor provides State RTO NOC & Forms 29/30</option>
                <option value="customer_responsibility">Buyer arranges transfer locally</option>
                <option value="not_applicable_non_rto">Not Applicable (Off-road equipment / non-RTO)</option>
              </select>
            </div>

            {/* GST / Tax Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">GST / Tax Invoice Terms</label>
              <select
                value={saleTerms.tax_gst_status}
                onChange={(e) => updateSale("tax_gst_status", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="18_percent_extra">18% GST extra on sale invoice</option>
                <option value="included">GST included in asking price</option>
                <option value="exempt">Margin scheme / Exempt sale</option>
              </select>
            </div>

            {/* Inspection & Mechanic Check */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Pre-Purchase Inspections</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateSale("inspection_allowed", !saleTerms.inspection_allowed)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left text-xs font-medium cursor-pointer transition",
                    saleTerms.inspection_allowed
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <p className="font-semibold flex items-center justify-between">
                    Site Visit {saleTerms.inspection_allowed ? "✓" : "✗"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Physical inspection</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateSale("mechanic_check_allowed", !saleTerms.mechanic_check_allowed)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left text-xs font-medium cursor-pointer transition",
                    saleTerms.mechanic_check_allowed
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <p className="font-semibold flex items-center justify-between">
                    Mechanic Audit {saleTerms.mechanic_check_allowed ? "✓" : "✗"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">3rd party engineer check</p>
                </button>
              </div>
            </div>

            {/* Component Condition */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Estimated Under-carriage / Tyre Wear</label>
              <select
                value={saleTerms.tyre_track_wear_percent ?? 25}
                onChange={(e) => updateSale("tyre_track_wear_percent", parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value={10}>10% Wear (Near New)</option>
                <option value={25}>25% Wear (Good condition)</option>
                <option value={50}>50% Wear (Half life remaining)</option>
                <option value={75}>75% Wear (Replacement expected soon)</option>
              </select>
            </div>

            {/* Payment Milestones */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Balance Payment Milestone</label>
              <select
                value={saleTerms.balance_payment_terms}
                onChange={(e) => updateSale("balance_payment_terms", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="prior_to_dispatch">Full payment prior to equipment dispatch</option>
                <option value="on_inspection_and_handover">Payment at physical handover on site</option>
              </select>
            </div>
          </div>

          {/* Special Sale Terms Free Write */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Special Sale Conditions (Free Write)</label>
              {saleTerms.special_terms?.trim() && (
                <span className="text-[11px] font-medium text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" /> Requires Admin Review
                </span>
              )}
            </div>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="e.g. Includes extra 1.2m bucket and spare hydraulic filter kit. Sold as-is where-is after joint inspection..."
              value={saleTerms.special_terms || ""}
              onChange={(e) => updateSale("special_terms", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/50 resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              ⚠️ Note: Any custom free-text clauses will be checked by our review team before the listing is activated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

