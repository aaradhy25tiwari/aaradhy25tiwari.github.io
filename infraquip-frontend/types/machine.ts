// ── Machine / Listing Types ───────────────────────────────────

export type MachineCondition = "new" | "excellent" | "good" | "fair";
export type MachineRunningCondition = "running" | "not_running";
export type MachineOwnershipType = "owner" | "dealer";
export type ListingType = "rent" | "sale" | "both";
export type MachineStatus = "pending" | "approved" | "rejected" | "paused" | "deleted";
export type MinRentalDuration = string;

export interface RentalTermSheet {
  fuel_included: boolean;
  operators_included: boolean;
  operator_count: number;
  operator_shift_type: "single_shift_8h" | "single_shift_10h" | "double_shift_16h" | "24h_continuous" | string;
  working_hours_per_day: number;
  working_days_per_month: number;
  monthly_hours_limit: number;
  overtime_rate_hourly?: number;
  mob_demob_type: "customer_actuals" | "fixed_charge" | "free_over_3months" | string;
  mob_demob_charge?: number;
  operator_accommodation: "customer_provides" | "vendor_provided" | "not_applicable" | string;
  operator_food: "customer_provides" | "vendor_provided" | "not_applicable" | string;
  maintenance_sla_hours: number;
  security_deposit_months?: number;
  advance_rent_months?: number;
  special_terms?: string;
}

export interface SaleTermSheet {
  hypothecation_status: "no_loan" | "loan_active_vendor_clears" | "bank_noc_in_hand" | string;
  rto_noc_responsibility: "vendor_provided" | "customer_responsibility" | "not_applicable_non_rto" | string;
  tax_gst_status: "18_percent_extra" | "included" | "exempt" | string;
  inspection_allowed: boolean;
  mechanic_check_allowed: boolean;
  tyre_track_wear_percent?: number;
  engine_condition?: "excellent" | "good" | "needs_minor_service" | string;
  hydraulic_condition?: "normal" | "leak_free" | "serviced" | string;
  token_deposit_percent?: number;
  balance_payment_terms: "on_inspection_and_handover" | "prior_to_dispatch" | string;
  special_terms?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  listing_count?: number;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
}

export interface MachineImage {
  id: string;
  machine_id: string;
  storage_path: string;
  display_url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  file_size_bytes?: number;
}

export interface Machine {
  id: string;
  vendor_id: string;
  category_id: string;
  sub_category_id?: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  year_of_manufacture: number;
  condition: MachineCondition;
  running_condition: MachineRunningCondition;
  hmr?: number;
  ownership_type: MachineOwnershipType;
  capacity_specs: string;
  specifications?: Record<string, string | number>;
  description: string;
  listing_type: ListingType;
  min_rental_duration?: MinRentalDuration;
  availability: boolean;
  status: MachineStatus;
  rejection_reason?: string;

  // Pricing
  rental_price_hourly?: number;
  rental_price_daily?: number;
  rental_price_weekly?: number;
  rental_price_monthly?: number;
  purchase_price?: number;
  contact_for_price: boolean;
  is_negotiable?: boolean;

  // Location
  city: string;
  state: string;
  address_line?: string;
  latitude?: number;
  longitude?: number;

  // Analytics
  views_count: number;
  enquiries_count: number;
  wishlist_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  approved_at?: string;
  expires_at?: string;
  is_expired?: boolean;
  is_active?: boolean;

  // Expanded relations
  vendor?: VendorPublic;
  category?: Category;
  sub_category?: SubCategory;
  images: MachineImage[];
  primary_image?: MachineImage;
  avg_rating?: number;
  review_count?: number;
  is_wishlisted?: boolean; // For current user

  // RTO & Age Validation
  is_rto_registered?: boolean;
  registration_number?: string;
  chassis_number?: string;
  machine_serial_no?: string;
  serial_plate_photo_url?: string;

  // Detailed Term Sheets
  rental_term_sheet?: RentalTermSheet;
  sale_term_sheet?: SaleTermSheet;
  has_custom_terms?: boolean;
  is_term_sheet_locked?: boolean;
}

export interface MachineListItem {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  year_of_manufacture: number;
  condition: MachineCondition;
  running_condition: MachineRunningCondition;
  hmr?: number;
  ownership_type: MachineOwnershipType;
  listing_type: ListingType;
  status: MachineStatus;
  availability: boolean;
  expires_at?: string;
  is_expired?: boolean;
  is_active?: boolean;
  created_at?: string;
  city: string;
  state: string;
  rental_price_hourly?: number;
  rental_price_daily?: number;
  rental_price_weekly?: number;
  rental_price_monthly?: number;
  purchase_price?: number;
  contact_for_price: boolean;
  is_negotiable?: boolean;
  primary_image?: MachineImage;
  vendor_name: string;
  vendor_city: string;
  vendor_is_verified: boolean;
  views_count: number;
  enquiries_count?: number;
  avg_rating?: number;
  distance_km?: number; // PostGIS computed
  latitude?: number;
  longitude?: number;
  is_wishlisted?: boolean;
  is_rto_registered?: boolean;
  has_term_sheet?: boolean;
  fuel_included?: boolean;
  operators_included?: boolean;
  has_custom_terms?: boolean;
}

export interface VendorPublic {
  id: string;
  full_name: string;
  company_name?: string;
  city?: string;
  state?: string;
  avatar_url?: string;
  is_verified: boolean;
  response_rate?: number;
  member_since: string;
  total_listings: number;
  avg_rating?: number;
}

// ── Search & Filter Types ─────────────────────────────────────

export interface SearchFilters {
  q?: string;
  category?: string;
  make?: string;
  model?: string;
  city?: string;
  radius?: 10 | 25 | 50 | 100;
  min_price?: number;
  max_price?: number;
  listing_type?: ListingType;
  condition?: MachineCondition[];
  running_condition?: MachineRunningCondition;
  ownership_type?: MachineOwnershipType;
  available?: boolean;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "distance";
  page?: number;
  per_page?: number;
  lat?: number;
  lng?: number;
}

export interface SearchResponse {
  results: MachineListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  city?: string;
}
