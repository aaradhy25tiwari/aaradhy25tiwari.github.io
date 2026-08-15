// ── User & Auth Types ─────────────────────────────────────────

export type UserRole = "vendor" | "customer" | "broker" | "admin";
export type TextSize = "normal" | "large" | "xlarge";
export type DarkModePreference = "system" | "light" | "dark";

export interface User {
  id: string;
  auth_uid?: string;
  email: string;
  phone?: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  is_verified: boolean;
  is_banned: boolean;
  dark_mode_preference: DarkModePreference;
  text_size_preference: TextSize;
  created_at: string;
  updated_at: string;
  vendor_profile?: VendorProfile;
  customer_profile?: CustomerProfile;
  broker_profile?: BrokerProfile;
  current_subscription?: SubscriptionSummary;
}

export interface VendorProfile {
  id: string;
  user_id: string;
  company_name: string;
  gstin?: string;
  pan?: string;
  business_type?: "individual" | "company" | "partnership";
  description?: string;
  city?: string;
  state?: string;
  profile_photo_url?: string;
  is_verified: boolean;
  response_rate?: number;
  member_since: string;
  total_views: number;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  company_name?: string;
  designation?: string;
  city?: string;
  state?: string;
  corporate_id?: string;
}

export interface BrokerProfile {
  id: string;
  user_id: string;
  company_name?: string;
  gstin?: string;
  pan?: string;
  city?: string;
  state?: string;
  description?: string;
  member_since: string;
}

export interface SubscriptionSummary {
  plan_code: string;
  plan_name: string;
  status: "active" | "cancelled" | "expired" | "trialing" | "past_due";
  current_period_end?: string;
  active_listing_limit?: number;  // null = unlimited
  enquiry_limit_monthly?: number; // null = unlimited
  active_listings_used?: number;
  enquiries_used_this_month?: number;
}

// ── Auth Request/Response Types ────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: "vendor" | "customer" | "broker";
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

// ── Subscription Plan Types ────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  plan_code: string;
  name: string;
  role: "vendor" | "customer" | "broker";
  price_monthly: number;
  active_listing_limit?: number;
  photos_per_listing: number;
  enquiry_limit_monthly?: number;
  wishlist_limit?: number;
  has_featured_boost: boolean;
  boost_multiplier: number;
  has_full_analytics: boolean;
  has_export: boolean;
  has_daily_digest: boolean;
  has_bulk_rfq: boolean;
  has_priority_badge: boolean;
  has_spec_download: boolean;
  verified_badge_eligible: boolean;
  razorpay_plan_id?: string;
}

// ── Notification Types ─────────────────────────────────────────

export type NotificationType =
  | "enquiry_received"
  | "enquiry_replied"
  | "listing_approved"
  | "listing_rejected"
  | "subscription_expiry"
  | "new_message";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  metadata?: Record<string, string>;
  created_at: string;
}

// ── Enquiry Types ──────────────────────────────────────────────

export type EnquiryStatus = "pending" | "replied" | "closed";

export interface Enquiry {
  id: string;
  machine_id?: string;
  vendor_id: string;
  customer_id: string;
  requirement_type: "rent" | "buy";
  customer_company?: string;
  required_from?: string;
  required_duration_days?: number;
  location_of_use?: string;
  message?: string;
  status: EnquiryStatus;
  is_read_by_vendor: boolean;
  created_at: string;
  updated_at: string;
  machine?: import("./machine").MachineListItem;
  vendor?: import("./machine").VendorPublic;
  customer?: { full_name: string; company_name?: string; phone?: string };
}

export interface EnquiryMessage {
  id: string;
  enquiry_id: string;
  sender_id: string;
  message_text: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}
