"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Package,
  Eye,
  MessageSquare,
  CreditCard,
  ExternalLink,
  Loader2,
  Ban,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Sparkles,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, formatDate, formatINR, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VendorDetails {
  id: string;
  email: string;
  phone?: string | null;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  is_verified: boolean;
  is_banned: boolean;
  failed_login_attempts: number;
  reactivation_requested: boolean;
  reactivation_requested_at?: string | null;
  created_at: string;
  vendor_profile?: {
    id?: string | null;
    company_name: string;
    gstin?: string | null;
    pan?: string | null;
    business_type?: string | null;
    description?: string | null;
    city?: string | null;
    state?: string | null;
    profile_photo_url?: string | null;
    is_verified: boolean;
    response_rate?: number | null;
    member_since?: string | null;
    total_views?: number;
  } | null;
  stats: {
    total_machines: number;
    active_machines: number;
    pending_machines: number;
    paused_machines: number;
    rejected_machines: number;
    total_enquiries: number;
  };
  subscription?: {
    id?: string | null;
    status: string;
    plan_code: string;
    plan_name: string;
    price_monthly: number;
    active_listing_limit?: number | null;
    current_period_end?: string | null;
    created_at?: string | null;
  } | null;
  machines: Array<{
    id: string;
    slug: string;
    title: string;
    make: string;
    model: string;
    year_of_manufacture: number;
    status: string;
    availability?: boolean;
    city: string;
    state: string;
    category_name?: string | null;
    rental_price_daily?: number | null;
    rental_price_monthly?: number | null;
    purchase_price?: number | null;
    contact_for_price: boolean;
    views_count?: number;
    enquiries_count?: number;
    primary_image?: string | null;
    created_at: string;
  }>;
  recent_enquiries: Array<{
    id: string;
    requirement_type: string;
    customer_company?: string | null;
    location_of_use?: string | null;
    status: string;
    machine_title?: string | null;
    created_at: string;
  }>;
}

export default function AdminVendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const vendorId = params?.id as string;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const { data: vendor, isLoading, error } = useQuery<VendorDetails>({
    queryKey: ["admin-vendor-detail", vendorId],
    queryFn: async () => {
      const { data } = await apiClient.get<VendorDetails>(`/admin/vendors/${vendorId}`);
      return data;
    },
    enabled: !!vendorId,
  });

  // Toggle Verification mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch<{ message: string; is_verified: boolean }>(
        `/admin/vendors/${vendorId}/verify`
      );
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-detail", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      setActionMessage({ text: res.message, type: "success" });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      setActionMessage({ text: err.message || "Failed to update verification status.", type: "error" });
      setTimeout(() => setActionMessage(null), 4000);
    },
  });

  // Toggle Ban mutation
  const banMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.patch<{ message: string }>(`/admin/users/${vendorId}/ban`);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-detail", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      setActionMessage({ text: res.message, type: "success" });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      setActionMessage({ text: err.message || "Failed to update account ban status.", type: "error" });
      setTimeout(() => setActionMessage(null), 4000);
    },
  });

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading vendor details...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Vendors
        </Link>
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Vendor Not Found</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            The requested vendor account could not be found or has been removed.
          </p>
          <Button
            onClick={() => router.push("/admin/vendors")}
            variant="outline"
            className="mt-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Vendor List
          </Button>
        </div>
      </div>
    );
  }

  const profile = vendor.vendor_profile;
  const filteredMachines = vendor.machines.filter((m) => {
    if (machineFilter === "all") return true;
    if (machineFilter === "active") return m.status === "approved" && m.availability !== false;
    if (machineFilter === "pending") return m.status === "pending";
    if (machineFilter === "paused") return m.status === "paused" || m.availability === false;
    if (machineFilter === "rejected") return m.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Breadcrumbs & Back Navigation ───────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Vendors
        </Link>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <Link href="/admin/vendors" className="hover:text-foreground transition-colors">
            Vendors
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {profile?.company_name || vendor.full_name}
          </span>
        </div>
      </div>

      {/* ── Flash Notification Message ───────────────────────────── */}
      {actionMessage && (
        <div
          className={cn(
            "p-4 rounded-xl border text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200",
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Vendor Profile Hero Card ─────────────────────────────── */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar + Main Title & Tags */}
          <div className="flex items-start sm:items-center gap-5 min-w-0">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-2xl uppercase shadow-inner">
              {(profile?.company_name || vendor.full_name || "V").charAt(0)}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {profile?.company_name || vendor.full_name}
                </h1>

                {/* Verification Badge */}
                {vendor.is_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified Vendor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-3.5 w-3.5" /> Pending Verification
                  </span>
                )}

                {/* Ban Status */}
                {vendor.is_banned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive">
                    <Ban className="h-3.5 w-3.5" /> Account Banned
                  </span>
                )}
              </div>

              {/* Sub-line: Contact Person & ID */}
              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <span>Contact Person: <strong className="text-foreground">{vendor.full_name}</strong></span>
                <span>•</span>
                <span>ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{vendor.id.slice(0, 8)}...</code></span>
                <span>•</span>
                <span>Member since {formatDate(vendor.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Quick Admin Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t border-border lg:border-0">
            {/* Verify / Revoke Button */}
            <Button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              variant={vendor.is_verified ? "outline" : "default"}
              size="sm"
              className={cn(
                "gap-1.5 font-medium cursor-pointer transition-all",
                vendor.is_verified
                  ? "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
              )}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : vendor.is_verified ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {vendor.is_verified ? "Revoke Verification" : "Verify Vendor"}
            </Button>

            {/* Ban / Unban Button */}
            <Button
              onClick={() => banMutation.mutate()}
              disabled={banMutation.isPending}
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 font-medium cursor-pointer transition-all",
                vendor.is_banned
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  : "border-destructive/40 text-destructive hover:bg-destructive/10"
              )}
            >
              {banMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              {vendor.is_banned ? "Unban Account" : "Ban Account"}
            </Button>

            {/* Email Vendor */}
            <a
              href={`mailto:${vendor.email}?subject=InfraQuip Support Inquiry`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email
            </a>

            {/* Call Vendor */}
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Call
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Metrics Grid (Miller's Law & Visual Hierarchy) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Fleet</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {vendor.stats.total_machines}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {vendor.stats.active_machines} currently active
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {vendor.stats.pending_machines}
          </p>
          <span className="text-[11px] text-muted-foreground">
            Awaiting admin approval
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Enquiries</span>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {vendor.stats.total_enquiries}
          </p>
          <span className="text-[11px] text-muted-foreground">
            From verified buyers
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Response Rate</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {profile?.response_rate !== null && profile?.response_rate !== undefined ? `${profile.response_rate}%` : "100%"}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {profile?.total_views ?? 0} profile views
          </span>
        </div>
      </div>

      {/* ── Two Column: Profile & KYC / Subscription ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Vendor Profile & KYC Compliance (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business & KYC Card */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Business &amp; KYC Verification</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Type: <strong className="text-foreground capitalize">{profile?.business_type || "Company"}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Legal Name */}
              <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Company / Entity Name
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {profile?.company_name || vendor.full_name}
                </p>
              </div>

              {/* Contact Person */}
              <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Primary Contact Person
                </span>
                <p className="text-sm font-semibold text-foreground">{vendor.full_name}</p>
              </div>

              {/* GSTIN with Copy */}
              <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  GSTIN
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-medium text-foreground">
                    {profile?.gstin || "Not Submitted"}
                  </span>
                  {profile?.gstin && (
                    <button
                      onClick={() => copyToClipboard(profile.gstin!, "gstin")}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors p-1"
                      title="Copy GSTIN"
                    >
                      {copiedField === "gstin" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* PAN with Copy */}
              <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Permanent Account Number (PAN)
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-medium text-foreground">
                    {profile?.pan || "Not Submitted"}
                  </span>
                  {profile?.pan && (
                    <button
                      onClick={() => copyToClipboard(profile.pan!, "pan")}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors p-1"
                      title="Copy PAN"
                    >
                      {copiedField === "pan" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">
                    {vendor.email}
                  </span>
                  <button
                    onClick={() => copyToClipboard(vendor.email, "email")}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors p-1 shrink-0"
                    title="Copy Email"
                  >
                    {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Phone Number
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {vendor.phone || "Not Provided"}
                  </span>
                  {vendor.phone && (
                    <button
                      onClick={() => copyToClipboard(vendor.phone!, "phone")}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors p-1"
                      title="Copy Phone"
                    >
                      {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="sm:col-span-2 rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Operating Hub &amp; Yard Location
                </span>
                <p className="text-sm text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  {[profile?.city, profile?.state].filter(Boolean).join(", ") || "Pan-India"}
                </p>
              </div>

              {/* Bio / Description */}
              {profile?.description && (
                <div className="sm:col-span-2 rounded-xl bg-muted/30 p-3.5 border border-border/50 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Company Overview &amp; Fleet Specialization
                  </span>
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {profile.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Subscription & Account Security (1 col) */}
        <div className="space-y-6">
          {/* Subscription Card */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                <h2 className="text-base font-bold text-foreground">Plan &amp; Limits</h2>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 capitalize">
                {vendor.subscription?.status || "Active"}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="font-semibold text-foreground">
                  {vendor.subscription?.plan_name || "Free Vendor Plan"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Monthly Fee</span>
                <span className="font-semibold text-foreground">
                  {vendor.subscription?.price_monthly ? formatINR(vendor.subscription.price_monthly) : "₹0 (Free)"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Active Listings Limit</span>
                <span className="font-semibold text-foreground">
                  {vendor.subscription?.active_listing_limit ? `${vendor.subscription.active_listing_limit} listings` : "Unlimited"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Fleet Utilization</span>
                <span className="font-semibold text-foreground">
                  {vendor.stats.active_machines} / {vendor.subscription?.active_listing_limit ?? "∞"}
                </span>
              </div>

              {vendor.subscription?.current_period_end && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(vendor.subscription.current_period_end)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Account Security Card */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account Security &amp; Status
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Account Status</span>
                <span className={cn("font-semibold", vendor.is_banned ? "text-destructive" : "text-emerald-500")}>
                  {vendor.is_banned ? "Banned" : "Active & Standing"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Failed Logins</span>
                <span className="font-semibold text-foreground">
                  {vendor.failed_login_attempts} attempts
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Reactivation Request</span>
                <span className="font-semibold text-foreground">
                  {vendor.reactivation_requested ? (
                    <span className="text-amber-500">Requested</span>
                  ) : (
                    "None"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Machine Fleet Section (Law of Common Region & Progressive Disclosure) */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Machinery Fleet Listings</h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                {vendor.machines.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Heavy equipment listed by this vendor on the InfraQuip marketplace.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "All", count: vendor.machines.length },
              { id: "active", label: "Active", count: vendor.stats.active_machines },
              { id: "pending", label: "Pending", count: vendor.stats.pending_machines },
              { id: "paused", label: "Paused", count: vendor.stats.paused_machines },
              { id: "rejected", label: "Rejected", count: vendor.stats.rejected_machines },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMachineFilter(tab.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  machineFilter === tab.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {filteredMachines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40">
            <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-foreground">No equipment in this filter</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This vendor does not currently have machines under this status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map((m) => (
              <div
                key={m.id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-background/50 hover:bg-background p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-3">
                  {/* Image & Status Tag */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted">
                    {m.primary_image ? (
                      <img
                        src={m.primary_image}
                        alt={m.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 opacity-40" />
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
                          m.status === "approved"
                            ? "bg-emerald-600 text-white"
                            : m.status === "pending"
                            ? "bg-amber-500 text-white"
                            : m.status === "paused"
                            ? "bg-slate-600 text-white"
                            : "bg-destructive text-white"
                        )}
                      >
                        {m.status}
                      </span>
                    </div>

                    {m.category_name && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="rounded-md bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white">
                          {m.category_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title & Make/Model */}
                  <div>
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {m.make} • {m.model} • {m.year_of_manufacture}
                    </p>
                  </div>

                  {/* Pricing & Location */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="font-semibold text-amber-500">
                      {m.contact_for_price
                        ? "Contact for Price"
                        : m.rental_price_daily
                        ? `${formatINR(m.rental_price_daily)} /day`
                        : m.purchase_price
                        ? formatINR(m.purchase_price)
                        : "Flexible"}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <MapPin className="h-3 w-3" />
                      {[m.city, m.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </div>

                {/* Footer link to public listing */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    Added {formatRelativeTime(m.created_at)}
                  </span>
                  <a
                    href={`/machines/${m.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    View Machine <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Enquiry Activity ─────────────────────────────── */}
      {vendor.recent_enquiries && vendor.recent_enquiries.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <h2 className="text-base font-bold text-foreground">Recent Customer Enquiries</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Last {vendor.recent_enquiries.length} enquiries
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {vendor.recent_enquiries.map((enq) => (
              <div key={enq.id} className="py-3 flex items-center justify-between text-xs gap-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">
                    {enq.customer_company || "Direct Enterprise Contractor"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Machine: <strong className="text-foreground">{enq.machine_title || "General Enquiry"}</strong>
                    {enq.location_of_use && ` • Location: ${enq.location_of_use}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-muted">
                    {enq.requirement_type}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                      enq.status === "replied" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}
                  >
                    {enq.status}
                  </span>
                  <span className="text-muted-foreground text-[11px] hidden sm:inline">
                    {formatRelativeTime(enq.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

