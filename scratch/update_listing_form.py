import re

file_path = r"infraquip-frontend/components/dashboard/ListingForm.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
old_lucide = 'import {\n  Loader2, CheckCircle, ChevronRight, ChevronLeft, Save, CloudOff,\n  LocateFixed, Search, Clock, Calendar, CalendarDays, CalendarRange, Check, Sparkles, ChevronDown\n} from "lucide-react";'
new_lucide = '''import { 
  Loader2, CheckCircle, ChevronRight, ChevronLeft, Save, CloudOff, 
  LocateFixed, Search, Clock, Calendar, CalendarDays, CalendarRange, Check, Sparkles, ChevronDown,
  ShieldCheck, Upload, FileText, AlertTriangle
} from "lucide-react";
import { TermSheetFormStep } from "./TermSheetFormStep";
import type { RentalTermSheet, SaleTermSheet } from "@/types/machine";'''

if old_lucide in content:
    content = content.replace(old_lucide, new_lucide, 1)
else:
    # Try more flexible replacement for lucide
    content = re.sub(
        r'import\s*\{\s*Loader2,[\s\S]*?ChevronDown\s*\}\s*from\s*"lucide-react";',
        new_lucide,
        content,
        count=1
    )

# 2. Update schema
old_schema_tail = '''  contact_for_price: z.boolean(),
  is_negotiable: z.boolean(),
});'''

new_schema_tail = '''  contact_for_price: z.boolean(),
  is_negotiable: z.boolean(),
  is_rto_registered: z.boolean().default(true),
  registration_number: z.string().optional(),
  chassis_number: z.string().optional(),
  machine_serial_no: z.string().optional(),
  serial_plate_photo_url: z.string().optional(),
  rental_term_sheet: z.any().optional(),
  sale_term_sheet: z.any().optional(),
  has_custom_terms: z.boolean().optional(),
});'''

content = content.replace(old_schema_tail, new_schema_tail, 1)

# 3. Update STEPS
old_steps = '''const STEPS = [
  { id: "details",  label: "Machine Details" },
  { id: "pricing",  label: "Pricing" },
  { id: "location", label: "Location" },
  { id: "images",   label: "Photos" },
];'''

new_steps = '''const STEPS = [
  { id: "details",  label: "Machine Details" },
  { id: "pricing",  label: "Pricing" },
  { id: "location", label: "Location" },
  { id: "images",   label: "Photos" },
  { id: "terms",    label: "Term Sheet" },
];

const DEFAULT_RENTAL_TERMS: RentalTermSheet = {
  fuel_included: false,
  operators_included: true,
  operator_count: 1,
  operator_shift_type: "single_shift_10h",
  working_hours_per_day: 10,
  working_days_per_month: 26,
  monthly_hours_limit: 260,
  overtime_rate_hourly: 500,
  mob_demob_type: "customer_actuals",
  mob_demob_charge: 0,
  operator_accommodation: "customer_provides",
  operator_food: "customer_provides",
  maintenance_sla_hours: 24,
  security_deposit_months: 1,
  advance_rent_months: 1,
  special_terms: "",
};

const DEFAULT_SALE_TERMS: SaleTermSheet = {
  hypothecation_status: "no_loan",
  rto_noc_responsibility: "vendor_provided",
  tax_gst_status: "18_percent_extra",
  inspection_allowed: true,
  mechanic_check_allowed: true,
  tyre_track_wear_percent: 25,
  engine_condition: "excellent",
  hydraulic_condition: "normal",
  token_deposit_percent: 10,
  balance_payment_terms: "prior_to_dispatch",
  special_terms: "",
};'''

content = content.replace(old_steps, new_steps, 1)

# 4. Update EMPTY_FORM_VALUES
old_empty = '''  contact_for_price: false,
  is_negotiable: false,
};'''

new_empty = '''  contact_for_price: false,
  is_negotiable: false,
  is_rto_registered: true,
  registration_number: "",
  chassis_number: "",
  machine_serial_no: "",
  serial_plate_photo_url: "",
};'''

content = content.replace(old_empty, new_empty, 1)

# 5. Update useForm default values when machine is provided
old_default_tail = '''          contact_for_price: machine.contact_for_price ?? false,
          is_negotiable: machine.is_negotiable ?? false,
        }
      : EMPTY_FORM_VALUES,'''

new_default_tail = '''          contact_for_price: machine.contact_for_price ?? false,
          is_negotiable: machine.is_negotiable ?? false,
          is_rto_registered: machine.is_rto_registered ?? true,
          registration_number: machine.registration_number || "",
          chassis_number: machine.chassis_number || "",
          machine_serial_no: machine.machine_serial_no || "",
          serial_plate_photo_url: machine.serial_plate_photo_url || "",
        }
      : EMPTY_FORM_VALUES,'''

content = content.replace(old_default_tail, new_default_tail, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Part 1 of ListingForm updated successfully!")

