"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, CheckCircle, ChevronRight, ChevronLeft, Save, CloudOff, 
  LocateFixed, Search, Clock, Calendar, CalendarDays, CalendarRange, Check, Sparkles, ChevronDown 
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn, scrollToTop } from "@/lib/utils";
import type { Category, Machine } from "@/types/machine";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { 
  getMakesForCategory, 
  getModelsForMake, 
  getCapacityForModel, 
  type EquipmentMasterItem 
} from "@/lib/data/equipmentMasterData";

const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  make: z.string().min(2, "Make / Brand is required"),
  model: z.string().min(1, "Model is required"),
  year_of_manufacture: z
    .number({ message: "Year is required" })
    .min(1980, "Year must be 1980 or later")
    .max(CURRENT_YEAR, `Year cannot be in the future (max ${CURRENT_YEAR})`),
  condition: z.enum(["new", "excellent", "good", "fair"]),
  running_condition: z.enum(["running", "not_running"]),
  hmr: z.number().min(0, "Cannot be negative").optional(),
  ownership_type: z.enum(["owner", "dealer"]),
  category_id: z.string().min(1, "Please select a category"),
  capacity_specs: z.string().min(3, "Capacity details are required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  listing_type: z.enum(["rent", "sale", "both"]),
  min_rental_duration: z.string().nullish(),
  availability: z.boolean(),
  city: z.string().min(2, "City is required").max(40, "City cannot exceed 40 characters"),
  state: z.string().min(2, "State is required").max(40, "State cannot exceed 40 characters"),
  rental_price_hourly: z.number().positive("Price must be positive").optional(),
  rental_price_daily: z.number().positive("Price must be positive").optional(),
  rental_price_weekly: z.number().positive("Price must be positive").optional(),
  rental_price_monthly: z.number().positive("Price must be positive").optional(),
  purchase_price: z.number().positive("Price must be positive").optional(),
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
        "w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50",
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
    <div className="relative w-full">
      <select
        className={cn(
          "w-full rounded-xl border bg-background px-4 py-2.5 pr-10 text-sm outline-none transition-all appearance-none cursor-pointer",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
          error ? "border-destructive" : "border-border",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}

// ── Duration parser helper ────────────────────────────────────

function parseDuration(raw?: string | null): { value: number | ""; unit: "hours" | "days" | "weeks" | "months" } {
  if (!raw) return { value: 1, unit: "days" };
  const str = raw.toLowerCase().trim();
  if (str.includes("_")) {
    const [n, u] = str.split("_");
    const num = parseInt(n, 10) || 1;
    let unitStr = u || "day";
    if (!unitStr.endsWith("s")) unitStr = `${unitStr}s`;
    if (["hours", "days", "weeks", "months"].includes(unitStr)) {
      return { value: num, unit: unitStr as "hours" | "days" | "weeks" | "months" };
    }
    return { value: num, unit: "days" };
  }
  const match = str.match(/^(\d+)\s*([a-z]+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    let unitStr = match[2];
    if (!unitStr.endsWith("s")) unitStr = `${unitStr}s`;
    if (["hours", "days", "weeks", "months"].includes(unitStr)) {
      return { value: num, unit: unitStr as "hours" | "days" | "weeks" | "months" };
    }
  }
  return { value: 1, unit: "days" };
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
  listing_type: "rent",
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
  const queryClient = useQueryClient();
  const isEditing = !!machine;
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(machine?.id ?? null);
  const [saveAction, setSaveAction] = useState<"photos" | "finish">("photos");
  const [draftSaved, setDraftSaved] = useState(false);
  const [availableDraft, setAvailableDraft] = useState<Partial<FormData> | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialDuration = parseDuration(machine?.min_rental_duration);
  const [durationValue, setDurationValue] = useState<number | "">(initialDuration.value);
  const [durationUnit, setDurationUnit] = useState<"hours" | "days" | "weeks" | "months">(initialDuration.unit);

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
          title: machine.title || "",
          make: machine.make || "",
          model: machine.model || "",
          year_of_manufacture: machine.year_of_manufacture,
          condition: machine.condition,
          running_condition: machine.running_condition || "running",
          hmr: machine.hmr ?? undefined,
          ownership_type: machine.ownership_type || "owner",
          category_id: machine.category_id || "",
          capacity_specs: machine.capacity_specs || "",
          description: machine.description || "",
          listing_type: machine.listing_type || "rent",
          min_rental_duration: machine.min_rental_duration ?? undefined,
          availability: machine.availability ?? true,
          city: machine.city || "",
          state: machine.state || "",
          rental_price_hourly: machine.rental_price_hourly ?? undefined,
          rental_price_daily: machine.rental_price_daily ?? undefined,
          rental_price_weekly: machine.rental_price_weekly ?? undefined,
          rental_price_monthly: machine.rental_price_monthly ?? undefined,
          purchase_price: machine.purchase_price ?? undefined,
          contact_for_price: machine.contact_for_price ?? false,
        }
      : EMPTY_FORM_VALUES,
  });

  const handleDurationChange = (val: number | "", unit: "hours" | "days" | "weeks" | "months") => {
    setDurationValue(val);
    setDurationUnit(unit);
    if (val === "" || val <= 0) {
      setValue("min_rental_duration", undefined, { shouldValidate: true, shouldDirty: true });
    } else {
      const singularUnit = unit.replace(/s$/, "");
      const formatted = `${val} ${val === 1 ? singularUnit : unit}`;
      setValue("min_rental_duration", formatted, { shouldValidate: true, shouldDirty: true });
    }
  };

  // Register make & model for schema validation
  useEffect(() => {
    register("make");
    register("model");
    register("min_rental_duration");
  }, [register]);

  // Synchronize form when editing existing machine
  useEffect(() => {
    if (machine) {
      reset({
        title: machine.title || "",
        make: machine.make || "",
        model: machine.model || "",
        year_of_manufacture: machine.year_of_manufacture,
        condition: machine.condition,
        running_condition: machine.running_condition || "running",
        hmr: machine.hmr ?? undefined,
        ownership_type: machine.ownership_type || "owner",
        category_id: machine.category_id || "",
        capacity_specs: machine.capacity_specs || "",
        description: machine.description || "",
        listing_type: (machine.listing_type as "rent" | "sale" | "both") || "rent",
        min_rental_duration: machine.min_rental_duration ?? undefined,
        availability: machine.availability ?? true,
        city: machine.city || "",
        state: machine.state || "",
        rental_price_hourly: machine.rental_price_hourly ?? undefined,
        rental_price_daily: machine.rental_price_daily ?? undefined,
        rental_price_weekly: machine.rental_price_weekly ?? undefined,
        rental_price_monthly: machine.rental_price_monthly ?? undefined,
        purchase_price: machine.purchase_price ?? undefined,
        contact_for_price: machine.contact_for_price ?? false,
      });
      if (machine.rental_price_hourly) setSelectedDuration("hourly");
      else if (machine.rental_price_daily) setSelectedDuration("daily");
      else if (machine.rental_price_weekly) setSelectedDuration("weekly");
      else if (machine.rental_price_monthly) setSelectedDuration("monthly");

      if (machine.min_rental_duration) {
        const parsed = parseDuration(machine.min_rental_duration);
        setDurationValue(parsed.value);
        setDurationUnit(parsed.unit);
      }
      setSavedId(machine.id);
    }
  }, [machine, reset]);

  // ── Master data dynamic catalog ────────────────────────────
  const OTHER_OPTION = "__other__";
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [customMake, setCustomMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");

  const { data: dynamicCatalog = [] } = useQuery<EquipmentMasterItem[]>({
    queryKey: ["master-catalog"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<EquipmentMasterItem[]>("/categories/master-catalog");
        return res.data;
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const selectedCategoryId = watch("category_id");
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const availableMakes = getMakesForCategory(selectedCategory?.name, dynamicCatalog);
  const availableModels = getModelsForMake(
    selectedMake === OTHER_OPTION ? "" : selectedMake,
    selectedCategory?.name,
    dynamicCatalog
  );

  // Sync initial make & model when editing
  useEffect(() => {
    if (machine) {
      if (machine.make) {
        const isKnown = availableMakes.some((m) => m.toLowerCase() === machine.make.toLowerCase());
        if (isKnown) {
          const match = availableMakes.find((m) => m.toLowerCase() === machine.make.toLowerCase()) || machine.make;
          setSelectedMake(match);
          setCustomMake("");
        } else {
          setSelectedMake(OTHER_OPTION);
          setCustomMake(machine.make);
        }
      }
      if (machine.model) {
        const isKnownModel = availableModels.some((m) => m.model.toLowerCase() === machine.model.toLowerCase());
        if (isKnownModel) {
          const match = availableModels.find((m) => m.model.toLowerCase() === machine.model.toLowerCase())?.model || machine.model;
          setSelectedModel(match);
          setCustomModel("");
        } else {
          setSelectedModel(OTHER_OPTION);
          setCustomModel(machine.model);
        }
      }
    }
  }, [machine, availableMakes.length, dynamicCatalog.length]);

  const handleMakeChange = (val: string) => {
    setSelectedMake(val);
    if (val === OTHER_OPTION) {
      setValue("make", customMake || "", { shouldValidate: true, shouldDirty: true });
      setSelectedModel(OTHER_OPTION);
      setValue("model", customModel || "", { shouldValidate: true, shouldDirty: true });
    } else {
      setCustomMake("");
      setValue("make", val, { shouldValidate: true, shouldDirty: true });
      setSelectedModel("");
      setCustomModel("");
      setValue("model", "", { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleModelChange = (val: string) => {
    setSelectedModel(val);
    if (val === OTHER_OPTION) {
      setValue("model", customModel || "", { shouldValidate: true, shouldDirty: true });
    } else {
      setCustomModel("");
      setValue("model", val, { shouldValidate: true, shouldDirty: true });
      const cap = getCapacityForModel(selectedMake, val, selectedCategory?.name, dynamicCatalog);
      if (cap && !watch("capacity_specs")) {
        setValue("capacity_specs", cap, { shouldValidate: true, shouldDirty: true });
      }
    }
  };

  const handleCustomMakeChange = (val: string) => {
    setCustomMake(val);
    setValue("make", val, { shouldValidate: true, shouldDirty: true });
  };

  const handleCustomModelChange = (val: string) => {
    setCustomModel(val);
    setValue("model", val, { shouldValidate: true, shouldDirty: true });
  };

  // ── Single Rate duration option (Hourly, Daily, Weekly, Monthly) ──
  const [selectedDuration, setSelectedDuration] = useState<"hourly" | "daily" | "weekly" | "monthly">(() => {
    if (machine) {
      if (machine.rental_price_hourly) return "hourly";
      if (machine.rental_price_daily) return "daily";
      if (machine.rental_price_weekly) return "weekly";
      if (machine.rental_price_monthly) return "monthly";
    }
    return "daily";
  });

  const [pricingError, setPricingError] = useState<string | null>(null);

  const selectDuration = (id: "hourly" | "daily" | "weekly" | "monthly") => {
    setSelectedDuration(id);
    if (id !== "hourly") setValue("rental_price_hourly", undefined);
    if (id !== "daily") setValue("rental_price_daily", undefined);
    if (id !== "weekly") setValue("rental_price_weekly", undefined);
    if (id !== "monthly") setValue("rental_price_monthly", undefined);
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

    // 1. Try internal Next.js API route (/api/pincode/[pin])
    try {
      const res = await fetch(`/api/pincode/${pin}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.city && data.state) {
          applyLocation(data.city, data.state);
          return;
        }
      }
    } catch {
      /* fallback to direct APIs */
    }

    // 2. Direct Fallback: api.postalpincode.in (with generous 8s timeout)
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice.find((o: { BranchType?: string }) => o.BranchType?.includes("Sub") || o.BranchType?.includes("Head")) || data[0].PostOffice[0];
        const city = (po.District || po.Block || po.Name || "").replace(/\./g, "").trim();
        const state = (po.State || "").replace(/\./g, "").trim();
        if (city && state) {
          applyLocation(city, state);
          return;
        }
      }
    } catch {
      /* fallback */
    }

    // 3. Direct Fallback: Nominatim OpenStreetMap
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${pin}&country=India&format=json&addressdetails=1`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const addr = data[0].address || {};
          const city = (addr.city || addr.town || addr.city_district || addr.district || addr.county || addr.state_district || "").trim();
          const state = (addr.state || "").trim();
          if (city || state) {
            applyLocation(city || state, state || city);
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

  // ── Draft detection (create-only, do not auto-fill so fields remain empty with background placeholders) ──
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
          setAvailableDraft(draft);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch { /* ignore */ }
  }, [isEditing]);

  const restoreDraft = (draft: Partial<FormData>) => {
    if (draft.rental_price_hourly) setSelectedDuration("hourly");
    else if (draft.rental_price_daily) setSelectedDuration("daily");
    else if (draft.rental_price_weekly) setSelectedDuration("weekly");
    else if (draft.rental_price_monthly) setSelectedDuration("monthly");

    if (draft.min_rental_duration) {
      const parsed = parseDuration(draft.min_rental_duration);
      setDurationValue(parsed.value);
      setDurationUnit(parsed.unit);
    }
    if (draft.make) {
      const isKnown = availableMakes.some((m) => m.toLowerCase() === draft.make?.toLowerCase());
      if (isKnown) {
        const match = availableMakes.find((m) => m.toLowerCase() === draft.make?.toLowerCase()) || draft.make;
        setSelectedMake(match);
        setCustomMake("");
      } else {
        setSelectedMake(OTHER_OPTION);
        setCustomMake(draft.make);
      }
    }
    if (draft.model) {
      const modelsForThisMake = getModelsForMake(draft.make, selectedCategory?.name, dynamicCatalog);
      const isKnownModel = modelsForThisMake.some((m) => m.model.toLowerCase() === draft.model?.toLowerCase());
      if (isKnownModel) {
        const match = modelsForThisMake.find((m) => m.model.toLowerCase() === draft.model?.toLowerCase())?.model || draft.model;
        setSelectedModel(match);
        setCustomModel("");
      } else {
        setSelectedModel(OTHER_OPTION);
        setCustomModel(draft.model);
      }
    }
    reset({ ...EMPTY_FORM_VALUES, ...draft, listing_type: "rent" });
    setAvailableDraft(null);
    setFeedbackMessage("Draft restored");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Sync min_rental_duration default value
  useEffect(() => {
    if (!watch("min_rental_duration")) {
      const val = durationValue || 1;
      const unit = durationUnit || "days";
      const singularUnit = unit.replace(/s$/, "");
      const formatted = `${val} ${val === 1 ? singularUnit : unit}`;
      setValue("min_rental_duration", formatted, { shouldValidate: true });
    }
  }, [durationValue, durationUnit, setValue, watch]);

  // Autosave to localStorage 2s after last user change (only if user entered data)
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
      allValues.state?.trim()
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
      setValue("listing_type", "rent");

      // Ensure min_rental_duration is properly set
      const val = durationValue || 1;
      const unit = durationUnit || "days";
      const singularUnit = unit.replace(/s$/, "");
      const formatted = `${val} ${val === 1 ? singularUnit : unit}`;
      setValue("min_rental_duration", formatted, { shouldValidate: true });

      const validDuration = await trigger("min_rental_duration");
      if (!validDuration) return;

      if (!contactForPrice) {
        let currentRate: number | undefined;
        if (selectedDuration === "hourly") currentRate = watch("rental_price_hourly");
        else if (selectedDuration === "daily") currentRate = watch("rental_price_daily");
        else if (selectedDuration === "weekly") currentRate = watch("rental_price_weekly");
        else if (selectedDuration === "monthly") currentRate = watch("rental_price_monthly");

        if (currentRate === undefined || currentRate === null || isNaN(currentRate) || currentRate <= 0) {
          setPricingError(`Please enter a valid ${selectedDuration} rental rate or check 'Contact for price'.`);
          return;
        }

        // Clean up unselected rates
        if (selectedDuration !== "hourly") setValue("rental_price_hourly", undefined);
        if (selectedDuration !== "daily") setValue("rental_price_daily", undefined);
        if (selectedDuration !== "weekly") setValue("rental_price_weekly", undefined);
        if (selectedDuration !== "monthly") setValue("rental_price_monthly", undefined);
      } else {
        setValue("rental_price_hourly", undefined);
        setValue("rental_price_daily", undefined);
        setValue("rental_price_weekly", undefined);
        setValue("rental_price_monthly", undefined);
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    scrollToTop();
  };

  const onInvalid = (fieldErrors: Record<string, unknown>) => {
    // Jump to the first step containing errors if submitted from step 2
    const step0Fields = stepFields[0];
    const hasStep0Error = step0Fields.some((f) => fieldErrors[f]);
    if (hasStep0Error) {
      setStep(0);
      scrollToTop();
      return;
    }
    if (fieldErrors.listing_type || fieldErrors.min_rental_duration || fieldErrors.rental_price_hourly || fieldErrors.rental_price_daily || fieldErrors.rental_price_weekly || fieldErrors.rental_price_monthly) {
      setStep(1);
      scrollToTop();
      return;
    }
  };

  const onSubmit = async (payload: FormData) => {
    setServerError(null);
    try {
      // Ensure only the chosen duration rate is passed (and others explicitly null to clear old rate in DB)
      const cleanPayload: Record<string, any> = { ...payload };
      if (!cleanPayload.contact_for_price) {
        if (selectedDuration !== "hourly") cleanPayload.rental_price_hourly = null;
        if (selectedDuration !== "daily") cleanPayload.rental_price_daily = null;
        if (selectedDuration !== "weekly") cleanPayload.rental_price_weekly = null;
        if (selectedDuration !== "monthly") cleanPayload.rental_price_monthly = null;
      } else {
        cleanPayload.rental_price_hourly = null;
        cleanPayload.rental_price_daily = null;
        cleanPayload.rental_price_weekly = null;
        cleanPayload.rental_price_monthly = null;
      }
      if (isEditing && machine) {
        await apiClient.put(`/vendor/listings/${machine.id}`, cleanPayload);
        await queryClient.invalidateQueries({ queryKey: ["vendor-listing", machine.id] });
        await queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
        if (saveAction === "photos") {
          setFeedbackMessage("Location & changes saved");
          setTimeout(() => setFeedbackMessage(null), 3000);
          setStep(3); // Advance to Photos step
          scrollToTop();
        } else {
          setDone(true);
          scrollToTop();
          setTimeout(() => router.push("/dashboard/vendor/listings"), 1500);
        }
      } else {
        const { data } = await apiClient.post<Machine>("/vendor/listings", cleanPayload);
        setSavedId(data.id);
        await queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
        localStorage.removeItem(DRAFT_KEY); // Clear draft on success
        setStep(3); // Move to photo upload step
        scrollToTop();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setServerError(msg);
      scrollToTop();
    }
  };

  const discardDraft = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    localStorage.removeItem(DRAFT_KEY);
    setSelectedDuration("daily");
    setDurationValue(1);
    setDurationUnit("days");
    setPincode("");
    setPincodeStatus("idle");
    setGpsStatus("idle");
    setPricingError(null);
    setServerError(null);
    setAvailableDraft(null);
    setSelectedMake("");
    setCustomMake("");
    setSelectedModel("");
    setCustomModel("");
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
      {/* Unsaved draft prompt banner (if previous session draft exists) */}
      {!isEditing && availableDraft && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Found an unsaved draft from a previous session
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {availableDraft.title ? `"${availableDraft.title}"` : "Untitled machine draft"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => restoreDraft(availableDraft)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm cursor-pointer"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY);
                setAvailableDraft(null);
                setFeedbackMessage("Draft deleted");
                setTimeout(() => setFeedbackMessage(null), 3000);
              }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isAccessible = isEditing || i <= step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => isAccessible && setStep(i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all flex-shrink-0",
                  i === step && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                  i < step && "bg-emerald-500 text-white cursor-pointer",
                  isEditing && i !== step && "border border-primary/50 text-foreground hover:bg-primary/10 cursor-pointer",
                  !isEditing && i > step && "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {i < step ? "✓" : i + 1}
              </button>
              <button
                type="button"
                onClick={() => isAccessible && setStep(i)}
                disabled={!isAccessible}
                className={cn(
                  "text-xs font-medium hidden sm:block text-left transition-colors",
                  i === step ? "text-foreground font-bold" : "text-muted-foreground",
                  isAccessible && "hover:text-primary cursor-pointer"
                )}
              >
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1 mx-1", i < step ? "bg-emerald-500" : "bg-border")} />
              )}
            </div>
          );
        })}
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

                {/* Make Dropdown strictly from Excel/Master Catalog */}
                <Field 
                  label="Make / Brand *" 
                  error={errors.make?.message} 
                  hint={selectedMake === OTHER_OPTION ? "Specify your custom brand name below" : "Select brand strictly from master catalog or choose Other"}
                >
                  <div className="space-y-2">
                    <Select
                      value={selectedMake}
                      onChange={(e) => handleMakeChange(e.target.value)}
                      error={!!errors.make && !customMake}
                    >
                      <option value="" disabled>Select Make / Brand...</option>
                      {availableMakes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value={OTHER_OPTION}>Other (Not in list)</option>
                    </Select>
                    {selectedMake === OTHER_OPTION && (
                      <Input
                        placeholder="Please specify Make / Brand name *"
                        value={customMake}
                        onChange={(e) => handleCustomMakeChange(e.target.value)}
                        error={!!errors.make}
                        className="animate-in fade-in zoom-in-95 duration-150"
                      />
                    )}
                  </div>
                </Field>

                {/* Model Dropdown strictly from Excel/Master Catalog */}
                <Field 
                  label="Model *" 
                  error={errors.model?.message} 
                  hint={selectedModel === OTHER_OPTION ? "Specify your custom model name below" : "Select model strictly from catalog or choose Other"}
                >
                  <div className="space-y-2">
                    <Select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={!selectedMake || selectedMake === OTHER_OPTION}
                      error={!!errors.model && !customModel}
                    >
                      {!selectedMake ? (
                        <option value="">Select a Make first...</option>
                      ) : selectedMake === OTHER_OPTION ? (
                        <option value={OTHER_OPTION}>Other (Custom Make)</option>
                      ) : (
                        <>
                          <option value="" disabled>Select Model...</option>
                          {availableModels.map((item) => (
                            <option key={item.model} value={item.model}>
                              {item.model} {item.capacity ? `(${item.capacity})` : ""}
                            </option>
                          ))}
                          <option value={OTHER_OPTION}>Other (Not in list)</option>
                        </>
                      )}
                    </Select>
                    {(selectedModel === OTHER_OPTION || selectedMake === OTHER_OPTION) && (
                      <Input
                        placeholder="Please specify Model name *"
                        value={customModel}
                        onChange={(e) => handleCustomModelChange(e.target.value)}
                        error={!!errors.model}
                        className="animate-in fade-in zoom-in-95 duration-150"
                      />
                    )}
                  </div>
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

                {/* Capacity & Specs in Row 5 Column 2 */}
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
              </div>

              {/* Description spanning full width below 2-column grid */}
              <Field label="Description *" error={errors.description?.message} hint="Describe machine condition, working hours, attachments included.">
                <textarea
                  rows={5}
                  placeholder="e.g. Well-maintained machine. Used primarily for light site preparation. Full dealer service history available with valid fitness certificate and attachments..."
                  className={cn(
                    "w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-all resize-none placeholder:text-muted-foreground/50",
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
                  Specify your rental pricing — choose hourly, daily, weekly, or monthly rate.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Listing Type *" error={errors.listing_type?.message}>
                  <Select error={!!errors.listing_type} {...register("listing_type")} defaultValue="rent">
                    <option value="rent">For Rent</option>
                  </Select>
                </Field>

                <Field 
                  label="Minimum Rental Duration *" 
                  error={errors.min_rental_duration?.message}
                  hint="Set minimum period (e.g. 2 weeks, 3 months, 5 days, 12 hours)"
                >
                  <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="e.g. 2"
                      value={durationValue}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1);
                        handleDurationChange(val, durationUnit);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "+" || e.key === ".") e.preventDefault();
                      }}
                      error={!!errors.min_rental_duration}
                    />
                    <Select
                      value={durationUnit}
                      onChange={(e) => {
                        const unit = e.target.value as "hours" | "days" | "weeks" | "months";
                        handleDurationChange(durationValue === "" ? 1 : durationValue, unit);
                      }}
                      error={!!errors.min_rental_duration}
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="hours">Hours</option>
                    </Select>
                  </div>
                </Field>
              </div>

              {/* ── Single Rate Duration Selector for Rent ── */}
              {!contactForPrice && (
                <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="text-sm font-semibold text-foreground">
                        Select Rate Duration
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose which duration rate to set (Hourly, Daily, Weekly, or Monthly)
                      </p>
                    </div>
                  </div>

                  {/* Duration selection pills (Single selection) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "hourly", label: "Hourly Rate", unit: "₹ / hour", icon: Clock },
                      { id: "daily", label: "Daily Rate", unit: "₹ / day", icon: Calendar },
                      { id: "weekly", label: "Weekly Rate", unit: "₹ / week", icon: CalendarDays },
                      { id: "monthly", label: "Monthly Rate", unit: "₹ / month", icon: CalendarRange },
                    ].map((dur) => {
                      const isSelected = selectedDuration === dur.id;
                      const Icon = dur.icon;
                      return (
                        <button
                          key={dur.id}
                          type="button"
                          onClick={() => selectDuration(dur.id as "hourly" | "daily" | "weekly" | "monthly")}
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

                  {/* Active Single Rate Input Field */}
                  <div className="pt-2">
                    {selectedDuration === "hourly" && (
                      <Field label="Hourly Rate (₹) *" error={errors.rental_price_hourly?.message} hint="Price per hour of operation">
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

                    {selectedDuration === "daily" && (
                      <Field label="Daily Rate (₹) *" error={errors.rental_price_daily?.message} hint="Price per 8-hour / daily shift">
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

                    {selectedDuration === "weekly" && (
                      <Field label="Weekly Rate (₹) *" error={errors.rental_price_weekly?.message} hint="Price per 7-day week">
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

                    {selectedDuration === "monthly" && (
                      <Field label="Monthly Rate (₹) *" error={errors.rental_price_monthly?.message} hint="Price per 30-day month">
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
                  <p className="text-xs text-destructive">Could not auto-verify PIN code. You can enter City and State manually below.</p>
                )}
                {pincodeStatus === "ok" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Location auto-filled: {watch("city") ? `${watch("city")}, ` : ""}{watch("state")}
                  </p>
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
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-2.5">
              {step < 2 && (
                <Button type="button" onClick={nextStep} className="btn-amber-glow gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              {step === 2 && (
                <>
                  {isEditing && (
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setSaveAction("finish")}
                      className="gap-2 border-border cursor-pointer"
                    >
                      <Save className="h-4 w-4" /> Save & Exit
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="btn-amber-glow gap-2 cursor-pointer"
                    disabled={isSubmitting}
                    onClick={() => setSaveAction("photos")}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {isEditing ? "Save & Go to Photos" : "Save & Add Photos"}
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </>
              )}

              {step === 3 && (
                <Button
                  type="button"
                  className="btn-amber-glow gap-2 cursor-pointer"
                  onClick={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["vendor-listing", machine?.id || savedId] });
                    await queryClient.invalidateQueries({ queryKey: ["vendor-listings"] });
                    setDone(true);
                    setTimeout(() => router.push("/dashboard/vendor/listings"), 1500);
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isEditing ? "Done (Back to Listings)" : "Submit Listing"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
