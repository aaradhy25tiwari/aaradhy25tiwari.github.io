"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { 
  Loader2, CheckCircle, ChevronRight, ChevronLeft, Save, CloudOff, 
  LocateFixed, Search, Clock, Calendar, CalendarDays, CalendarRange, Check, Sparkles 
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category, Machine } from "@/types/machine";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { getMakesForCategory, getModelsForMake, getCapacityForModel } from "@/lib/data/equipmentMasterData";

const CURRENT_YEAR = new Date().getFullYear();

// ── Validation schema ─────────────────────────────────────────
const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  make: z.string().min(2, "Make / Brand is required"),
  model: z.string().min(1, "Model is required"),
  year_of_manufacture: z
    .number()
    .min(1980, "Year must be 1980 or later")
    .max(CURRENT_YEAR, `Year cannot be in the future (max ${CURRENT_YEAR})`),
  condition: z.enum(["new", "excellent", "good", "fair"]),
  running_condition: z.enum(["running", "not_running"]),
  hmr: z.number().min(0, "HMR cannot be negative").optional(),
  ownership_type: z.enum(["owner", "dealer"]),
  category_id: z.string().min(1, "Please select a category"),
  capacity_specs: z.string().min(3, "Capacity details are required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  listing_type: z.enum(["rent", "sale", "both"]),
  min_rental_duration: z.enum(["1_hour", "1_day", "1_week", "1_month"]).optional(),
  availability: z.boolean(),
  city: z.string().min(2, "City is required").max(40, "City cannot exceed 40 characters"),
  state: z.string().min(2, "State is required").max(40, "State cannot exceed 40 characters"),
  rental_price_hourly: z.number().positive("Hourly rate must be positive").optional(),
  rental_price_daily: z.number().positive("Daily rate must be positive").optional(),
  rental_price_weekly: z.number().positive("Weekly rate must be positive").optional(),
  rental_price_monthly: z.number().positive("Monthly rate must be positive").optional(),
  purchase_price: z.number().positive("Purchase price must be positive").optional(),
  contact_for_price: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ── Step config ───────────────────────────────────────────────
const STEPS = [
  { id: "details",  label: "Machine Details" },
  { id: "pricing",  label: "Pricing" },
  { id: "location", label: "Location" },
  { id: "images",   label: "Photos" },
];

// ── Field group ───────────────────────────────────────────────
function Field({
  label, error, children, hint,
}: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Input({ className, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-all",
        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
        error ? "border-destructive" : "border-border",
        className
      )}
      {...props}
    />
  );
}

function Select({ className, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-all",
        "focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none",
        error ? "border-destructive" : "border-border",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ── Props ─────────────────────────────────────────────────────
interface ListingFormProps {
  /** Existing machine for edit mode — undefined for create */
  machine?: Machine;
}

const EMPTY_FORM_VALUES: Partial<FormData> = {
  title: "",
  make: "",
  model: "",
  year_of_manufacture: undefined,
  condition: undefined,
  running_condition: undefined,
  hmr: undefined,
  ownership_type: undefined,
  category_id: "",
  capacity_specs: "",
  description: "",
  listing_type: undefined,
  min_rental_duration: undefined,
  availability: true,
  city: "",
  state: "",
  rental_price_hourly: undefined,
  rental_price_daily: undefined,
  rental_price_weekly: undefined,
  rental_price_monthly: undefined,
  purchase_price: undefined,
  contact_for_price: false,
};

// ── Component ─────────────────────────────────────────────────
export function ListingForm({ machine }: ListingFormProps) {
  const DRAFT_KEY = "infraquip_listing_draft";
  const router = useRouter();
  const isEditing = !!machine;
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(machine?.id ?? null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: machine
      ? {
          title: machine.title,
          make: machine.make,
          model: machine.model,
          year_of_manufacture: machine.year_of_manufacture,
          condition: machine.condition,
          running_condition: machine.running_condition,
          hmr: machine.hmr,
          ownership_type: machine.ownership_type,
          category_id: machine.category_id,
          capacity_specs: machine.capacity_specs,
          description: machine.description,
          listing_type: machine.listing_type,
          min_rental_duration: machine.min_rental_duration ?? undefined,
          availability: machine.availability,
          city: machine.city,
          state: machine.state,
          rental_price_hourly: machine.rental_price_hourly,
          rental_price_daily: machine.rental_price_daily,
          rental_price_weekly: machine.rental_price_weekly,
          rental_price_monthly: machine.rental_price_monthly,
          purchase_price: machine.purchase_price,
          contact_for_price: machine.contact_for_price,
        }
      : EMPTY_FORM_VALUES,
  });

  // ── Master data auto-suggestions ────────────────────────────
  const selectedCategoryId = watch("category_id");
  const currentMake = watch("make");
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const suggestedMakes = getMakesForCategory(selectedCategory?.name);
  const suggestedModels = getModelsForMake(currentMake, selectedCategory?.name);

  // ── Rate duration options (Hourly, Daily, Weekly, Monthly) ──
  const [selectedDurations, setSelectedDurations] = useState<string[]>(() => {
    if (machine) {
      const active: string[] = [];
      if (machine.rental_price_hourly) active.push("hourly");
      if (machine.rental_price_daily) active.push("daily");
      if (machine.rental_price_weekly) active.push("weekly");
      if (machine.rental_price_monthly) active.push("monthly");
      return active.length > 0 ? active : ["daily"];
    }
    return ["daily"];
  });

  const [pricingError, setPricingError] = useState<string | null>(null);

  const toggleDuration = (id: string) => {
    setSelectedDurations((prev) => {
      if (prev.includes(id)) {
        if (id === "hourly") setValue("rental_price_hourly", undefined);
        if (id === "daily") setValue("rental_price_daily", undefined);
        if (id === "weekly") setValue("rental_price_weekly", undefined);
        if (id === "monthly") setValue("rental_price_monthly", undefined);
        const next = prev.filter((d) => d !== id);
        return next.length > 0 ? next : prev;
      } else {
        return [...prev, id];
      }
    });
  };

  // ── Location helpers with multi-provider fallbacks ───────────
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const lookupPincode = useCallback(async (pin: string) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    setPincodeStatus("loading");

    const applyLocation = (c: string, s: string) => {
      const cleanCity = c.trim().slice(0, 40);
      const cleanState = s.trim().slice(0, 40);
      setValue("city", cleanCity, { shouldValidate: true });
      setValue("state", cleanState, { shouldValidate: true });
      setPincodeStatus("ok");
    };

    // 1. Try postalpincode.in
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        const city = po.District || po.Block || po.Name || "";
        const state = po.State || "";
        if (city && state) {
          applyLocation(city, state);
          return;
        }
      }
    } catch {
      /* fallback */
    }

    // 2. Try Zippopotam
    try {
      const res = await fetch(`https://api.zippopotam.us/in/${pin}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          const city = place["place name"] || "";
          const state = place["state"] || "";
          if (city && state) {
            applyLocation(city, state);
            return;
          }
        }
      }
    } catch {
      /* fallback */
    }

    // 3. Try OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${pin}&country=India&format=json&addressdetails=1`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const addr = data[0].address || {};
          const city = addr.city || addr.town || addr.district || addr.county || addr.state_district || "";
          const state = addr.state || "";
          if (city || state) {
            applyLocation(city || state, state);
            return;
          }
        }
      }
    } catch {
      /* fallback */
    }

    setPincodeStatus("error");
  }, [setValue]);

  const fetchGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");

    const applyLocation = (c: string, s: string) => {
      const cleanCity = c.trim().slice(0, 40);
      const cleanState = s.trim().slice(0, 40);
      setValue("city", cleanCity, { shouldValidate: true });
      setValue("state", cleanState, { shouldValidate: true });
      setGpsStatus("ok");
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // 1. Try BigDataCloud
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (res.ok) {
            const data = await res.json();
            const city = data.city || data.locality || data.principalSubdivision || "";
            const state = data.principalSubdivision || "";
            if (city || state) {
              applyLocation(city || state, state);
              return;
            }
          }
        } catch {
          /* fallback */
        }

        // 2. Fallback to Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || addr.district || addr.state_district || "";
            const state = addr.state || "";
            if (city || state) {
              applyLocation(city || state, state);
              return;
            }
          }
        } catch {
          /* fail */
        }

        setGpsStatus("error");
      },
      (err) => {
        console.warn("Geolocation warning:", err);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [setValue]);

  const listingType = watch("listing_type");
  const contactForPrice = watch("contact_for_price");
  const allValues = watch();

  // ── Draft autosave (create-only) ────────────────────────────
  // Restore draft on mount only if meaningful content exists
  useEffect(() => {
    if (isEditing) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<FormData>;
        const hasData = !!(
          draft.title?.trim() ||
          draft.make?.trim() ||
          draft.model?.trim() ||
          draft.category_id ||
          draft.description?.trim() ||
          draft.city?.trim() ||
          draft.state?.trim()
        );
        if (hasData) {
          const active: string[] = [];
          if (draft.rental_price_hourly) active.push("hourly");
          if (draft.rental_price_daily) active.push("daily");
          if (draft.rental_price_weekly) active.push("weekly");
          if (draft.rental_price_monthly) active.push("monthly");
          if (active.length > 0) setSelectedDurations(active);
          reset({ ...EMPTY_FORM_VALUES, ...draft });
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave to localStorage 2s after last change (only if data exists)
  useEffect(() => {
    if (isEditing || step === 3) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    const hasData = !!(
      allValues.title?.trim() ||
      allValues.make?.trim() ||
      allValues.model?.trim() ||
      allValues.category_id ||
      allValues.description?.trim() ||
      allValues.city?.trim() ||
      allValues.state?.trim() ||
      allValues.purchase_price
    );

    if (!hasData) return;

    autosaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(allValues));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allValues), isEditing, step]);

  // Load categories
  useEffect(() => {
    apiClient.get<Category[]>("/categories").then((r) => setCategories(r.data));
  }, []);

  // Step validation fields map
  const stepFields: Record<number, (keyof FormData)[]> = {
    0: [
      "title", "category_id", "make", "model", "year_of_manufacture",
      "condition", "running_condition", "ownership_type",
      "capacity_specs", "description"
    ],
    1: ["listing_type"],
    2: ["city", "state"],
  };

  const nextStep = async () => {
    // Validate Step 0 fields
    if (step === 0) {
      const valid = await trigger(stepFields[0]);
      if (!valid) return;
    }

    // Validate Step 1 fields
    if (step === 1) {
      setPricingError(null);
      const validListingType = await trigger("listing_type");
      if (!validListingType) return;

      const isRent = listingType === "rent" || listingType === "both";
      const isSale = listingType === "sale" || listingType === "both";

      if (isRent) {
        const validDuration = await trigger("min_rental_duration");
        if (!validDuration) return;

        if (!contactForPrice) {
          const h = watch("rental_price_hourly");
          const d = watch("rental_price_daily");
          const w = watch("rental_price_weekly");
          const m = watch("rental_price_monthly");
          if (!h && !d && !w && !m) {
            setPricingError("Please enter at least one rental rate (hourly, daily, weekly, or monthly) or check 'Contact for price'.");
            return;
          }
        }
      }

      if (isSale && !contactForPrice) {
        const p = watch("purchase_price");
        if (!p || p <= 0) {
          setPricingError("Please enter a valid sale price or check 'Contact for price'.");
          return;
        }
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onInvalid = (fieldErrors: Record<string, unknown>) => {
    // Jump to the first step containing errors if submitted from step 2
    const step0Fields = stepFields[0];
    const hasStep0Error = step0Fields.some((f) => fieldErrors[f]);
    if (hasStep0Error) {
      setStep(0);
      return;
    }
    if (fieldErrors.listing_type || fieldErrors.min_rental_duration || fieldErrors.purchase_price) {
      setStep(1);
      return;
    }
  };

  const onSubmit = async (payload: FormData) => {
    setServerError(null);
    try {
      if (isEditing && machine) {
        await apiClient.put(`/vendor/listings/${machine.id}`, payload);
        setDone(true);
        setTimeout(() => router.push("/dashboard/vendor/listings"), 2000);
      } else {
        const { data } = await apiClient.post<Machine>("/vendor/listings", payload);
        setSavedId(data.id);
        localStorage.removeItem(DRAFT_KEY); // Clear draft on success
        setStep(3); // Move to photo upload step
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setServerError(msg);
    }
  };

  const discardDraft = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    localStorage.removeItem(DRAFT_KEY);
    setSelectedDurations(["daily"]);
    setPincode("");
    setPincodeStatus("idle");
    setGpsStatus("idle");
    setPricingError(null);
    setServerError(null);
    reset(EMPTY_FORM_VALUES);
    setStep(0);
    setFeedbackMessage("Draft discarded");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">
          {isEditing ? "Changes saved!" : "Listing submitted!"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEditing
            ? "Your listing has been updated successfully."
            : "Your machine is now pending admin review. We'll notify you once it's approved."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all flex-shrink-0",
                i === step && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                i < step && "bg-emerald-500 text-white cursor-pointer",
                i > step && "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {i < step ? "✓" : i + 1}
            </button>
            <span className={cn(
              "text-xs font-medium hidden sm:block",
              i === step ? "text-foreground" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1 mx-1", i < step ? "bg-emerald-500" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Draft autosave indicator */}
      {!isEditing && (
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-1.5 text-xs transition-all duration-500",
            feedbackMessage ? "text-amber-500 font-medium" : draftSaved ? "text-emerald-500" : "text-muted-foreground/50"
          )}>
            {feedbackMessage ? (
              <span>✓ {feedbackMessage}</span>
            ) : draftSaved ? (
              <><Save className="h-3 w-3" />Draft saved</>
            ) : (
              <><CloudOff className="h-3 w-3" />Auto-saving draft…</>
            )}
          </div>
          <button
            type="button"
            onClick={discardDraft}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            Discard draft
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-6 lg:p-8">
        <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          {/* ── Step 0: Details ─────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold mb-6">Machine Details</h2>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Listing Title *" error={errors.title?.message}>
                  <Input
                    placeholder="e.g. JCB 3CX Backhoe Loader 2021"
                    error={!!errors.title}
                    {...register("title")}
                  />
                </Field>
                <Field label="Category *" error={errors.category_id?.message}>
                  <Select error={!!errors.category_id} {...register("category_id")} defaultValue="">
                    <option value="" disabled>Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>

                {/* Make with Master Data Autocomplete */}
                <Field 
                  label="Make / Brand *" 
                  error={errors.make?.message} 
                  hint={suggestedMakes.length > 0 ? "Select from suggestions or type brand name" : "e.g. JCB, CATERPILLAR, VOLVO..."}
                >
                  <Input
                    placeholder="e.g. JCB, CATERPILLAR, VOLVO..."
                    list="makes-datalist"
                    autoComplete="off"
                    error={!!errors.make}
                    {...register("make")}
                  />
                  <datalist id="makes-datalist">
                    {suggestedMakes.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>

                {/* Model with Master Data Autocomplete & Specs Auto-fill */}
                <Field 
                  label="Model *" 
                  error={errors.model?.message} 
                  hint={suggestedModels.length > 0 ? "Select model or type custom model" : "e.g. 3CX, 320D..."}
                >
                  <Input
                    placeholder="e.g. 3CX, 3DX, 320D..."
                    list="models-datalist"
                    autoComplete="off"
                    error={!!errors.model}
                    {...register("model", {
                      onChange: (e) => {
                        const val = e.target.value;
                        const cap = getCapacityForModel(currentMake, val);
                        if (cap && !watch("capacity_specs")) {
                          setValue("capacity_specs", cap, { shouldValidate: true });
                        }
                      },
                    })}
                  />
                  <datalist id="models-datalist">
                    {suggestedModels.map((item) => (
                      <option key={item.model} value={item.model}>
                        {item.capacity ? `Capacity: ${item.capacity}` : ""}
                      </option>
                    ))}
                  </datalist>
                </Field>

                {/* Year of Manufacture — Cannot be in future */}
                <Field label="Year of Manufacture *" error={errors.year_of_manufacture?.message}>
                  <Input
                    type="number"
                    placeholder={`e.g. ${CURRENT_YEAR - 2}`}
                    min={1980}
                    max={CURRENT_YEAR}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                    }}
                    error={!!errors.year_of_manufacture}
                    {...register("year_of_manufacture", { valueAsNumber: true })}
                  />
                </Field>

                <Field label="Condition *" error={errors.condition?.message}>
                  <Select error={!!errors.condition} {...register("condition")} defaultValue="">
                    <option value="" disabled>Select condition...</option>
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </Select>
                </Field>

                <Field label="Running Status *" error={errors.running_condition?.message}>
                  <Select error={!!errors.running_condition} {...register("running_condition")} defaultValue="">
                    <option value="" disabled>Select running status...</option>
                    <option value="running">Running</option>
                    <option value="not_running">Not Running</option>
                  </Select>
                </Field>

                {/* HMR — Restrict negative */}
                <Field label="Hours Meter Reading (HMR)" error={errors.hmr?.message} hint="Optional (Recommended if selling)">
                  <Input
                    type="number"
                    placeholder="e.g. 4500"
                    min={0}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                    }}
                    error={!!errors.hmr}
                    {...register("hmr", { valueAsNumber: true })}
                  />
                </Field>

                <Field label="Ownership Type *" error={errors.ownership_type?.message}>
                  <Select error={!!errors.ownership_type} {...register("ownership_type")} defaultValue="">
                    <option value="" disabled>Select ownership type...</option>
                    <option value="owner">Direct Owner</option>
                    <option value="dealer">Dealer / Broker</option>
                  </Select>
                </Field>
              </div>

              <Field 
                label="Capacity & Specs *" 
                error={errors.capacity_specs?.message} 
                hint='e.g. "20 ton, 1.2m³ bucket, 136 HP"'
              >
                <Input
                  placeholder="e.g. 20 ton, 1.2m³ bucket, 136 HP"
                  error={!!errors.capacity_specs}
                  {...register("capacity_specs")}
                />
              </Field>

              <Field label="Description *" error={errors.description?.message} hint="Describe machine condition, working hours, attachments included.">
                <textarea
                  rows={5}
                  placeholder="Describe the machine in detail (working condition, attachments, service history)..."
                  className={cn(
                    "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all resize-none",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    errors.description ? "border-destructive" : "border-border"
                  )}
                  {...register("description")}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </Field>
            </div>
          )}

          {/* ── Step 1: Pricing ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Pricing & Availability</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Specify how you want to price your machine — by hour, day, week, month, or for direct sale.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Listing Type *" error={errors.listing_type?.message}>
                  <Select error={!!errors.listing_type} {...register("listing_type")} defaultValue="">
                    <option value="" disabled>Select listing type...</option>
                    <option value="rent">For Rent</option>
                    <option value="sale">For Sale</option>
                    <option value="both">Rent & Sale</option>
                  </Select>
                </Field>

                {(listingType === "rent" || listingType === "both") && (
                  <Field label="Minimum Rental Duration *" error={errors.min_rental_duration?.message}>
                    <Select error={!!errors.min_rental_duration} {...register("min_rental_duration")} defaultValue="">
                      <option value="" disabled>Select minimum duration...</option>
                      <option value="1_hour">1 Hour</option>
                      <option value="1_day">1 Day</option>
                      <option value="1_week">1 Week</option>
                      <option value="1_month">1 Month</option>
                    </Select>
                  </Field>
                )}
              </div>

              {/* ── Rate Duration Selector for Rent ── */}
              {(listingType === "rent" || listingType === "both") && !contactForPrice && (
                <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="text-sm font-semibold text-foreground">
                        Select Rate Durations
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose which duration rates you accept (Hourly, Daily, Weekly, Monthly)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDurations(["hourly", "daily", "weekly", "monthly"])}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Select All
                      </button>
                    </div>
                  </div>

                  {/* Duration selection pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "hourly", label: "Hourly Rate", unit: "₹ / hour", icon: Clock },
                      { id: "daily", label: "Daily Rate", unit: "₹ / day", icon: Calendar },
                      { id: "weekly", label: "Weekly Rate", unit: "₹ / week", icon: CalendarDays },
                      { id: "monthly", label: "Monthly Rate", unit: "₹ / month", icon: CalendarRange },
                    ].map((dur) => {
                      const isSelected = selectedDurations.includes(dur.id);
                      const Icon = dur.icon;
                      return (
                        <button
                          key={dur.id}
                          type="button"
                          onClick={() => toggleDuration(dur.id)}
                          className={cn(
                            "relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                              : "border-border bg-background/60 hover:border-primary/40 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {isSelected && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-foreground">{dur.label}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{dur.unit}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Rate Input Fields */}
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    {selectedDurations.includes("hourly") && (
                      <Field label="Hourly Rate (₹)" error={errors.rental_price_hourly?.message} hint="Price per hour of operation">
                        <Input
                          type="number"
                          placeholder="e.g. 800"
                          min={0}
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                          }}
                          error={!!errors.rental_price_hourly}
                          {...register("rental_price_hourly", { valueAsNumber: true })}
                        />
                      </Field>
                    )}

                    {selectedDurations.includes("daily") && (
                      <Field label="Daily Rate (₹)" error={errors.rental_price_daily?.message} hint="Price per 8-hour / daily shift">
                        <Input
                          type="number"
                          placeholder="e.g. 4500"
                          min={0}
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                          }}
                          error={!!errors.rental_price_daily}
                          {...register("rental_price_daily", { valueAsNumber: true })}
                        />
                      </Field>
                    )}

                    {selectedDurations.includes("weekly") && (
                      <Field label="Weekly Rate (₹)" error={errors.rental_price_weekly?.message} hint="Price per 7-day week">
                        <Input
                          type="number"
                          placeholder="e.g. 28000"
                          min={0}
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                          }}
                          error={!!errors.rental_price_weekly}
                          {...register("rental_price_weekly", { valueAsNumber: true })}
                        />
                      </Field>
                    )}

                    {selectedDurations.includes("monthly") && (
                      <Field label="Monthly Rate (₹)" error={errors.rental_price_monthly?.message} hint="Price per 30-day month">
                        <Input
                          type="number"
                          placeholder="e.g. 90000"
                          min={0}
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                          }}
                          error={!!errors.rental_price_monthly}
                          {...register("rental_price_monthly", { valueAsNumber: true })}
                        />
                      </Field>
                    )}
                  </div>
                </div>
              )}

              {/* ── Sale Price ── */}
              {(listingType === "sale" || listingType === "both") && !contactForPrice && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Sale Price (₹) *" error={errors.purchase_price?.message} hint="Total asking price for purchase">
                    <Input
                      type="number"
                      placeholder="e.g. 2500000"
                      min={0}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault();
                      }}
                      error={!!errors.purchase_price}
                      {...register("purchase_price", { valueAsNumber: true })}
                    />
                  </Field>
                </div>
              )}

              {/* Pricing error alert */}
              {pricingError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{pricingError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <input
                  id="contact_for_price"
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  {...register("contact_for_price")}
                />
                <div>
                  <label htmlFor="contact_for_price" className="text-sm font-medium cursor-pointer">
                    Contact for price
                  </label>
                  <p className="text-xs text-muted-foreground">Price will be shown as "Contact vendor" instead of an upfront amount</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <input
                  id="availability"
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  {...register("availability")}
                />
                <div>
                  <label htmlFor="availability" className="text-sm font-medium cursor-pointer">
                    Available now
                  </label>
                  <p className="text-xs text-muted-foreground">Uncheck if currently booked or unavailable for deployment</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Location ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold mb-2">Location</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your pincode for auto-fill, or use GPS — or type directly.
              </p>

              {/* ── Pincode lookup ── */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Pincode</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 411014"
                      value={pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setPincode(val);
                        setPincodeStatus("idle");
                        if (val.length === 6) lookupPincode(val);
                      }}
                      className={cn(
                        "w-full rounded-xl border bg-background px-4 py-2.5 pr-10 text-sm outline-none transition-all",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        pincodeStatus === "error" ? "border-destructive" : "border-border"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {pincodeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {pincodeStatus === "ok" && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => lookupPincode(pincode)}
                    disabled={pincode.length !== 6 || pincodeStatus === "loading"}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted transition disabled:opacity-40"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Fill
                  </button>
                </div>
                {pincodeStatus === "error" && (
                  <p className="text-xs text-destructive">Invalid pincode — please check and try again.</p>
                )}
                {pincodeStatus === "ok" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ City and state auto-filled from pincode.</p>
                )}
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* ── GPS button ── */}
              <button
                type="button"
                onClick={fetchGpsLocation}
                disabled={gpsStatus === "loading"}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition",
                  gpsStatus === "ok"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : gpsStatus === "error"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border hover:bg-muted"
                )}
              >
                {gpsStatus === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
                {gpsStatus === "loading" ? "Detecting location…" :
                 gpsStatus === "ok" ? "Location detected ✓" :
                 gpsStatus === "error" ? "Could not detect location — type manually" :
                 "Use Current Location"}
              </button>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or enter manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* ── City + State manual fields (Restricted to 40 chars) ── */}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City *" error={errors.city?.message} hint="Max 40 characters">
                  <Input
                    placeholder="e.g. Pune"
                    maxLength={40}
                    error={!!errors.city}
                    {...register("city")}
                  />
                </Field>
                <Field label="State *" error={errors.state?.message} hint="Max 40 characters">
                  <Input
                    placeholder="e.g. Maharashtra"
                    maxLength={40}
                    error={!!errors.state}
                    {...register("state")}
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
                📍 Only city and state are shown publicly — your exact address is never shared.
              </div>
            </div>
          )}

          {/* ── Step 3: Photos ───────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold mb-2">Photos</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Add up to 10 photos. The first photo marked as "Cover" will be shown in search results.
                {!savedId && " Your listing was saved — now add photos."}
              </p>

              {savedId ? (
                <ImageUploader
                  machineId={savedId}
                  existingImages={machine?.images}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                  Complete the previous steps and submit to unlock photo upload.
                </div>
              )}
            </div>
          )}

          {/* ── Error ────────────────────────────────────────── */}
          {serverError && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* ── Navigation ───────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              /* Step 2 is the last form step before images */
              step === 2 ? (
                <Button
                  type="submit"
                  className="btn-amber-glow gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {isEditing ? "Saving..." : "Saving draft..."}</>
                  ) : (
                    <>{isEditing ? <><Save className="h-4 w-4" /> Save Changes</> : <>Save & Add Photos <ChevronRight className="h-4 w-4" /></>}</>
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={nextStep} className="btn-amber-glow gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )
            ) : (
              <Button
                type="button"
                className="btn-amber-glow gap-2"
                onClick={() => {
                  setDone(true);
                  setTimeout(() => router.push("/dashboard/vendor/listings"), 2000);
                }}
              >
                <CheckCircle className="h-4 w-4" />
                {isEditing ? "Done" : "Submit Listing"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
