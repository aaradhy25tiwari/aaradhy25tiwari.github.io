"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShieldCheck,
  Truck,
  Banknote,
  FileCheck2,
  Wrench,
  Search,
  Phone,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Building2,
  Clock,
  Loader2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  BadgeAlert,
  ChevronDown
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn, scrollToTop, sortCategoriesAlphabetical } from "@/lib/utils";

const POPULAR_CATEGORIES = [
  "Excavators",
  "Backhoe Loaders",
  "Mobile Cranes",
  "Wheel Loaders",
  "Bulldozers",
  "Road Compactors",
  "Motor Graders",
  "Transit Mixers",
  "Forklifts & Reach Trucks",
  "Tipper Trucks",
  "Piling Rigs",
];

const POPULAR_MAKES = [
  "JCB",
  "Tata Hitachi",
  "Caterpillar (CAT)",
  "Komatsu",
  "Kobelco",
  "Sany",
  "Hyundai",
  "Volvo",
  "L&T",
  "Escorts",
  "Mahindra",
  "Bobcat",
  "Other / Open to Suggestions",
];

const BUDGET_RANGES = [
  "Under ₹15 Lakhs",
  "₹15 Lakhs - ₹30 Lakhs",
  "₹30 Lakhs - ₹60 Lakhs",
  "₹60 Lakhs - ₹1.2 Crore",
  "Above ₹1.2 Crore",
  "Flexible / Open to Quotes",
];

const TIMELINES = [
  "Immediate (Within 7 Days)",
  "15 to 30 Days",
  "1 to 3 Months",
  "Exploring / Feasibility",
];

const buySchema = z.object({
  category: z.string().min(2, "Please select an equipment category"),
  make: z.string().optional(),
  model: z.string().optional(),
  condition_preference: z.enum(["any", "new", "used"]),
  year_min: z.string().optional(),
  budget_range: z.string().min(1, "Please select your budget range"),
  delivery_city: z.string().min(2, "Please enter your destination city / site"),
  delivery_state: z.string().optional(),
  timeline: z.string().optional(),
  financing_needed: z.boolean(),
  inspection_needed: z.boolean(),
  transport_needed: z.boolean(),
  full_name: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(10, "Please enter a valid 10-digit mobile number").max(15),
  email: z.string().email("Please enter a valid email address"),
  company_name: z.string().optional(),
  additional_notes: z.string().max(2000).optional(),
});

type BuyFormData = z.infer<typeof buySchema>;

export function BuyEquipmentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Read initial query params from Hero search
  const initialCategoryParam = searchParams.get("category");
  const initialQueryParam = searchParams.get("q") || "";
  const initialCityParam = searchParams.get("city") || "";

  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get<Array<{ name: string }>>("/categories").then((res) => {
      if (res.data && res.data.length > 0) {
        setDynamicCategories(res.data.map((c) => c.name));
      }
    }).catch(() => {});
  }, []);

  const categoryOptions = sortCategoriesAlphabetical(
    dynamicCategories.length > 0 ? dynamicCategories : POPULAR_CATEGORIES
  );

  const defaultCategory = useMemo(() => {
    if (!initialCategoryParam) return "Excavators";
    const found = categoryOptions.find(
      (c) => c.toLowerCase() === initialCategoryParam.toLowerCase()
    );
    return found || "Excavators";
  }, [initialCategoryParam, categoryOptions]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuyFormData>({
    resolver: zodResolver(buySchema),
    defaultValues: {
      category: defaultCategory,
      model: initialQueryParam,
      make: "",
      condition_preference: "used",
      year_min: "2019",
      budget_range: "₹15 Lakhs - ₹30 Lakhs",
      delivery_city: initialCityParam,
      delivery_state: "",
      timeline: "Immediate (Within 7 Days)",
      financing_needed: true,
      inspection_needed: true,
      transport_needed: true,
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      email: user?.email || "",
      company_name: "",
      additional_notes: "",
    },
  });

  // Keep user profile synced if user loads asynchronously
  useEffect(() => {
    if (user) {
      if (user.full_name) setValue("full_name", user.full_name);
      if (user.phone) setValue("phone", user.phone);
      if (user.email) setValue("email", user.email);
    }
  }, [user, setValue]);

  // Real-time watched fields for the interactive summary card
  const watchedCategory = watch("category");
  const watchedMake = watch("make");
  const watchedModel = watch("model");
  const watchedCondition = watch("condition_preference");
  const watchedBudget = watch("budget_range");
  const watchedCity = watch("delivery_city");
  const watchedFinancing = watch("financing_needed");
  const watchedInspection = watch("inspection_needed");
  const watchedTransport = watch("transport_needed");

  const onSubmit = async (data: BuyFormData) => {
    try {
      setSubmissionError(null);
      const res = await apiClient.post("/enquiries/buy-request", {
        ...data,
        year_min: data.year_min ? parseInt(data.year_min, 10) || null : null,
      });

      const refId = res.data?.reference_id || `IQ-BUY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSubmittedRef(refId);
      scrollToTop();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to submit your procurement request. Please verify your details or contact our hotline directly.";
      setSubmissionError(errorMsg);
    }
  };

  const handleStartAnother = () => {
    setSubmittedRef(null);
    reset();
    scrollToTop();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Hero & Value Proposition ─────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="section-container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Heavy Equipment Buying &amp; Sourcing Desk
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Buy Heavy Machinery with <span className="text-amber-500">100% Peace of Mind</span>
            </h1>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Tell us what heavy equipment you need. We source certified new and pre-owned machines across India, complete with physical inspection reports, verified titles, and up to 80% financing.
            </p>

            {/* Trust Badges */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">100+ Point Inspection</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10">
                <Banknote className="h-5 w-5 text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">Up to 80% Loan Support</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10">
                <FileCheck2 className="h-5 w-5 text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">RTO NOC &amp; Clear Title</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/10">
                <Truck className="h-5 w-5 text-purple-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">Pan-India Transport</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Section: Form or Success Confirmation ─────────────── */}
      <section className="section-container py-12 sm:py-16">
        {submittedRef ? (
          /* ── Success Confirmation Screen ─────────────────────────── */
          <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 sm:p-12 shadow-2xl space-y-8 animate-fade-in text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                Procurement Request Received
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                We&apos;re Sourcing Your Machinery!
              </h2>
              <p className="text-sm text-slate-300">
                Your equipment purchase requirement has been logged under reference:
              </p>
              <div className="inline-block mt-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-amber-400 font-mono text-lg font-bold">
                {submittedRef}
              </div>
            </div>

            {/* Next Steps Roadmap */}
            <div className="text-left bg-slate-950/70 rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                What Happens Next?
              </h3>
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
                <div className="flex gap-3 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                    1
                  </div>
                  <p>
                    <strong className="text-white">Procurement Specialist Assigned:</strong> Our sourcing expert will review your requirements and reach out within 2 hours.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                    2
                  </div>
                  <p>
                    <strong className="text-white">2–3 Verified Matches:</strong> You&apos;ll receive detailed profiles of available machines matching your tonnage, brand, and budget with high-res photos and inspection reports.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                    3
                  </div>
                  <p>
                    <strong className="text-white">Inspection &amp; Financing:</strong> Coordinate physical inspection, finalize loan sanctioning, and verify documentation before payment.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                    4
                  </div>
                  <p>
                    <strong className="text-white">Doorstep Delivery &amp; RTO NOC:</strong> Machine is safely mobilized to your project site with clear title ownership transfer.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href={`https://wa.me/919171100095?text=${encodeURIComponent(
                  `Hi InfraQuip Procurement, I submitted buying request ${submittedRef}. Please update me on available machinery options.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20"
              >
                Fast-Track via WhatsApp
              </a>

              <Button
                variant="outline"
                onClick={handleStartAnother}
                className="gap-2 border-white/20 text-slate-200 hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
                Submit Another Request
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="text-slate-400 hover:text-white"
              >
                Return to Home
              </Button>
            </div>
          </div>
        ) : (
          /* ── The Procurement RFQ Form + Summary Card ────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
            {/* Left: The Form (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-slate-900/90 p-6 sm:p-10 shadow-2xl space-y-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Equipment Procurement Form
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Fill in your machinery specifications. Our Pan-India equipment sourcing team will match you with verified options.
                </p>
              </div>

              {submissionError && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <BadgeAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{submissionError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* ── Section 1: Equipment Details ──────────────────── */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    1. Machine Specifications
                  </h3>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Equipment Category <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register("category")}
                        className="w-full appearance-none rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat} className="bg-slate-900 text-white">
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    {errors.category && (
                      <p className="text-xs text-destructive">{errors.category.message}</p>
                    )}
                  </div>

                  {/* Make & Model in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Preferred Brand / Make
                      </label>
                      <div className="relative">
                        <select
                          {...register("make")}
                          className="w-full appearance-none rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        >
                          <option value="">Any Verified Brand</option>
                          {POPULAR_MAKES.map((brand) => (
                            <option key={brand} value={brand} className="bg-slate-900 text-white">
                              {brand}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Model / Tonnage Capacity
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 20-22 Ton, 3DX, 50 Ton Crane"
                        {...register("model")}
                        className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Condition & Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Condition Preference
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "used", label: "Pre-Owned" },
                          { id: "new", label: "Brand New" },
                          { id: "any", label: "Either" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setValue("condition_preference", opt.id as "any" | "new" | "used")}
                            className={cn(
                              "py-2.5 px-2 rounded-xl text-xs font-medium border text-center transition-all",
                              watchedCondition === opt.id
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold"
                                : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Minimum Year of Manufacture
                      </label>
                      <input
                        type="number"
                        min="2010"
                        max="2026"
                        placeholder="e.g. 2019"
                        {...register("year_min")}
                        className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Target Budget Range <span className="text-amber-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BUDGET_RANGES.map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setValue("budget_range", range)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-xs font-medium border text-left transition-all",
                            watchedBudget === range
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/50 font-bold"
                              : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                          )}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                    {errors.budget_range && (
                      <p className="text-xs text-destructive">{errors.budget_range.message}</p>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Location & Timeline ────────────────── */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    2. Location &amp; Timeline
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Delivery City / Project Site <span className="text-amber-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="e.g. Bhopal, Pune, Nagpur"
                          {...register("delivery_city")}
                          className="w-full rounded-xl bg-slate-950 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      {errors.delivery_city && (
                        <p className="text-xs text-destructive">{errors.delivery_city.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Purchase Timeline
                      </label>
                      <div className="relative">
                        <select
                          {...register("timeline")}
                          className="w-full appearance-none rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        >
                          {TIMELINES.map((t) => (
                            <option key={t} value={t} className="bg-slate-900 text-white">
                              {t}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Value Added Services ───────────────── */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    3. Value-Added Services Needed
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      watchedFinancing
                        ? "bg-amber-500/10 border-amber-500/40 text-white"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                    )}>
                      <input
                        type="checkbox"
                        {...register("financing_needed")}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 mt-0.5"
                      />
                      <div className="text-xs">
                        <span className="font-semibold block text-slate-200">Equipment Loan</span>
                        <span className="text-[11px] text-slate-400">Up to 80% financing</span>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      watchedInspection
                        ? "bg-amber-500/10 border-amber-500/40 text-white"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                    )}>
                      <input
                        type="checkbox"
                        {...register("inspection_needed")}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 mt-0.5"
                      />
                      <div className="text-xs">
                        <span className="font-semibold block text-slate-200">100+ Pt Inspection</span>
                        <span className="text-[11px] text-slate-400">Hydraulic &amp; engine test</span>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      watchedTransport
                        ? "bg-amber-500/10 border-amber-500/40 text-white"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                    )}>
                      <input
                        type="checkbox"
                        {...register("transport_needed")}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/40 mt-0.5"
                      />
                      <div className="text-xs">
                        <span className="font-semibold block text-slate-200">Pan-India Transport</span>
                        <span className="text-[11px] text-slate-400">Doorstep low-bed delivery</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ── Section 4: Buyer Contact Details ──────────────── */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                    4. Buyer Contact Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Full Name <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Patel"
                        {...register("full_name")}
                        className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      {errors.full_name && (
                        <p className="text-xs text-destructive">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Phone Number <span className="text-amber-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          {...register("phone")}
                          className="w-full rounded-xl bg-slate-950 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Email Address <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        {...register("email")}
                        className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Company / Contractor Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="e.g. Patel Infra &amp; Earthmovers"
                          {...register("company_name")}
                          className="w-full rounded-xl bg-slate-950 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Additional Requirements / Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Need rock breaker piping installed, low HMR under 5,000 hours, AC cabin required..."
                      {...register("additional_notes")}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting Procurement Request...
                      </>
                    ) : (
                      <>
                        Submit Equipment Procurement Request
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-slate-400 mt-2">
                    🔒 Zero obligation. We will never share your contact details with unverified third parties.
                  </p>
                </div>
              </form>
            </div>

            {/* Right: Live Summary & Trust Pillar (5 cols) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              {/* Interactive Sourcing Summary Card */}
              <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Your Sourcing Card
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Live Preview
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-400">Target Equipment</span>
                    <h3 className="text-lg font-bold text-white">
                      {watchedMake ? `${watchedMake} ` : ""}
                      {watchedCategory}
                    </h3>
                    {watchedModel && (
                      <p className="text-xs font-mono text-amber-400 mt-0.5">
                        Capacity / Model: {watchedModel}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Condition</span>
                      <span className="font-semibold text-slate-200 capitalize">
                        {watchedCondition === "used" ? "Certified Pre-Owned" : watchedCondition === "new" ? "Brand New" : "Either"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Budget Range</span>
                      <span className="font-semibold text-amber-400">
                        {watchedBudget}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Delivery Location</span>
                      <span className="font-semibold text-slate-200">
                        {watchedCity || "Pan-India"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Timeline</span>
                      <span className="font-semibold text-slate-200">
                        Immediate
                      </span>
                    </div>
                  </div>

                  {/* Included Services */}
                  <div className="pt-3 border-t border-white/5 space-y-1.5">
                    <span className="text-[11px] text-slate-400 block font-medium">Selected Services:</span>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {watchedInspection && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ 100+ Pt Inspection
                        </span>
                      )}
                      {watchedFinancing && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          ✓ Asset Financing Support
                        </span>
                      )}
                      {watchedTransport && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          ✓ Site Logistics &amp; Transport
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Procurement Help Desk */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Need Urgent Machinery?</h4>
                    <p className="text-xs text-slate-400">Speak directly with our senior procurement engineer</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href="tel:+919171100095"
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-amber-400" />
                    Call: +91 91711 00095
                  </a>
                  <a
                    href="https://wa.me/919171100095?text=Hi%20InfraQuip,%20I%20want%20to%20buy%20heavy%20machinery"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-2.5 text-xs font-semibold text-emerald-400 transition-colors"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              </div>

              {/* Frequently Asked Questions */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-3 text-xs text-slate-300">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                  Common Questions
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <p className="font-semibold text-slate-200">How does InfraQuip inspect machines?</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Our certified engineers test engine compression, hydraulic pump pressure, undercarriage wear, and verify actual HMR meter readings.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">Can I get an equipment loan?</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Yes. We partner with top NBFCs and banks (HDFC, Tata Capital, Sundaram, Kotak) to offer up to 80% financing on both new and certified used machinery.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">What about RTO documents and NOC?</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      We ensure 100% hypothecation clearance, GST invoice verification, and RTO NOC documentation for smooth ownership transfer across all Indian states.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
