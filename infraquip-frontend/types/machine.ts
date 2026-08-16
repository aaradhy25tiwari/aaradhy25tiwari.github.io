// ── Machine / Listing Types ───────────────────────────────────

export type MachineCondition = "new" | "excellent" | "good" | "fair";
export type MachineRunningCondition = "running" | "not_running";
export type MachineOwnershipType = "owner" | "dealer";
export type ListingType = "rent" | "sale" | "both";
export type MachineStatus = "pending" | "approved" | "rejected" | "paused" | "deleted";
export type MinRentalDuration = "1_day" | "1_week" | "1_month";

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
  rental_price_daily?: number;
  rental_price_weekly?: number;
  rental_price_monthly?: number;
  purchase_price?: number;
  contact_for_price: boolean;

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

  // Expanded relations
  vendor?: VendorPublic;
  category?: Category;
  sub_category?: SubCategory;
  images: MachineImage[];
  primary_image?: MachineImage;
  avg_rating?: number;
  review_count?: number;
  is_wishlisted?: boolean; // For current user
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
  city: string;
  state: string;
  rental_price_daily?: number;
  purchase_price?: number;
  contact_for_price: boolean;
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
