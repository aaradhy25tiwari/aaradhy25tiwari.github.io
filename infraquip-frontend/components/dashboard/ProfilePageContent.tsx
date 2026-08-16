"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, User, MapPin, Mail, Phone, Calendar, Briefcase, Building2, CheckCircle2, ShieldCheck, FileText, Pencil, X } from "lucide-react";
import apiClient from "@/lib/api/client";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
});

const brokerSchema = z.object({
  company_name: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  description: z.string().optional(),
});

const vendorSchema = z.object({
  company_name: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  business_type: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

const customerSchema = z.object({
  company_name: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type BrokerData = z.infer<typeof brokerSchema>;
type VendorData = z.infer<typeof vendorSchema>;
type CustomerData = z.infer<typeof customerSchema>;

export default function ProfilePageContent() {
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data } = await apiClient.get("/auth/me");
      return data;
    },
  });

  const user = profileQuery.data;
  const isBroker = user?.role === "broker";
  const isVendor = user?.role === "vendor";
  const isCustomer = user?.role === "customer";

  // Base Profile Form
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          full_name: user.full_name ?? "",
          phone: user.phone ?? "",
          company_name: user.company_name ?? "",
        }
      : undefined,
  });

  // Broker Form
  const brokerForm = useForm<BrokerData>({
    resolver: zodResolver(brokerSchema),
    values: isBroker && user?.broker_profile
      ? {
          company_name: user.broker_profile.company_name ?? "",
          gstin: user.broker_profile.gstin ?? "",
          pan: user.broker_profile.pan ?? "",
          city: user.broker_profile.city ?? "",
          state: user.broker_profile.state ?? "",
          description: user.broker_profile.description ?? "",
        }
      : undefined,
  });

  // Vendor Form
  const vendorForm = useForm<VendorData>({
    resolver: zodResolver(vendorSchema),
    values: isVendor && user?.vendor_profile
      ? {
          company_name: user.vendor_profile.company_name ?? "",
          gstin: user.vendor_profile.gstin ?? "",
          business_type: user.vendor_profile.business_type ?? "",
          city: user.vendor_profile.city ?? "",
          state: user.vendor_profile.state ?? "",
          description: user.vendor_profile.description ?? "",
        }
      : undefined,
  });

  // Customer Form
  const customerForm = useForm<CustomerData>({
    resolver: zodResolver(customerSchema),
    values: isCustomer && user?.customer_profile
      ? {
          company_name: user.customer_profile.company_name ?? "",
          designation: user.customer_profile.designation ?? "",
          city: user.customer_profile.city ?? "",
          state: user.customer_profile.state ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (payload: ProfileData) => {
      await apiClient.put("/auth/me", payload);
    },
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const brokerMutation = useMutation({
    mutationFn: async (payload: BrokerData) => {
      await apiClient.put("/auth/me/broker-profile", payload);
    },
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const vendorMutation = useMutation({
    mutationFn: async (payload: VendorData) => {
      await apiClient.put("/auth/me/vendor-profile", payload);
    },
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const customerMutation = useMutation({
    mutationFn: async (payload: CustomerData) => {
      await apiClient.put("/auth/me/customer-profile", payload);
    },
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  const onSubmit = (data: ProfileData) => mutation.mutate(data);
  const onBrokerSubmit = (data: BrokerData) => brokerMutation.mutate(data);
  const onVendorSubmit = (data: VendorData) => vendorMutation.mutate(data);
  const onCustomerSubmit = (data: CustomerData) => customerMutation.mutate(data);

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
        <p>Unable to load profile data. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your personal and business details.</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted"
        >
          {isEditing ? (
            <><X className="h-4 w-4" /> Cancel Edit</>
          ) : (
            <><Pencil className="h-4 w-4" /> Edit Profile</>
          )}
        </button>
      </div>

      {!isEditing ? (
        <div className="space-y-6">
          {/* Read Only View */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </h2>
            </div>
            <div className="p-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Full Name</p>
                <p className="mt-1 font-medium">{user.full_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.email}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.phone || "Not provided"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Account Role</p>
                <p className="mt-1 font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {user.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Member Since</p>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Role Specific Profile View */}
          {(isBroker || isVendor || isCustomer) && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-6 py-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {isBroker && "Broker Profile"}
                  {isVendor && "Vendor Profile"}
                  {isCustomer && "Customer Profile"}
                </h2>
              </div>
              <div className="p-6 grid gap-6 sm:grid-cols-2">
                {isBroker && user.broker_profile && (
                  <>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Company / Firm Name</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{user.broker_profile.company_name || "Not provided"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">City</p>
                      <p className="mt-1 font-medium">{user.broker_profile.city || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">State</p>
                      <p className="mt-1 font-medium">{user.broker_profile.state || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">GSTIN</p>
                      <p className="mt-1 font-medium">{user.broker_profile.gstin || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">PAN</p>
                      <p className="mt-1 font-medium">{user.broker_profile.pan || "Not provided"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Description</p>
                      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">{user.broker_profile.description || "No description provided."}</p>
                    </div>
                  </>
                )}

                {isVendor && user.vendor_profile && (
                  <>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Company Name</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{user.vendor_profile.company_name || "Not provided"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">City</p>
                      <p className="mt-1 font-medium">{user.vendor_profile.city || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">State</p>
                      <p className="mt-1 font-medium">{user.vendor_profile.state || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Business Type</p>
                      <p className="mt-1 font-medium">{user.vendor_profile.business_type || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">GSTIN</p>
                      <p className="mt-1 font-medium">{user.vendor_profile.gstin || "Not provided"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Description</p>
                      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">{user.vendor_profile.description || "No description provided."}</p>
                    </div>
                  </>
                )}

                {isCustomer && user.customer_profile && (
                  <>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Company Name</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{user.customer_profile.company_name || "Not provided"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Designation</p>
                      <p className="mt-1 font-medium">{user.customer_profile.designation || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">City</p>
                      <p className="mt-1 font-medium">{user.customer_profile.city || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">State</p>
                      <p className="mt-1 font-medium">{user.customer_profile.state || "Not provided"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Edit Forms */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Edit Personal Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
                <input id="full_name" {...register("full_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                <input id="phone" type="tel" {...register("phone")} placeholder="+91 98765 43210" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Email (Non-editable)</label>
                <input disabled value={user.email} className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
              </div>
            </div>

            {mutation.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {mutation.error.message}
              </div>
            )}

            {mutation.isSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                Personal information updated successfully.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting || mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Personal Info</>
                )}
              </button>
            </div>
          </form>

          {isBroker && (
            <form onSubmit={brokerForm.handleSubmit(onBrokerSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-8">
              <div>
                <h2 className="text-lg font-semibold">Broker Profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your brokerage details shown to vendors and customers.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="broker_company" className="text-sm font-medium">Company / Firm Name</label>
                  <input id="broker_company" {...brokerForm.register("company_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="broker_city" className="text-sm font-medium">City</label>
                  <input id="broker_city" {...brokerForm.register("city")} placeholder="Pune" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="broker_state" className="text-sm font-medium">State</label>
                  <input id="broker_state" {...brokerForm.register("state")} placeholder="Maharashtra" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="broker_gstin" className="text-sm font-medium">GSTIN</label>
                  <input id="broker_gstin" {...brokerForm.register("gstin")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="broker_pan" className="text-sm font-medium">PAN</label>
                  <input id="broker_pan" {...brokerForm.register("pan")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="broker_description" className="text-sm font-medium">Description</label>
                <textarea
                  id="broker_description"
                  rows={3}
                  {...brokerForm.register("description")}
                  placeholder="e.g. Specialising in excavators and cranes for highway projects across Maharashtra..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {brokerMutation.error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {brokerMutation.error.message}
                </div>
              )}

              {brokerMutation.isSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  Broker profile updated successfully.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={brokerForm.formState.isSubmitting || brokerMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {brokerForm.formState.isSubmitting || brokerMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Broker Profile</>
                  )}
                </button>
              </div>
            </form>
          )}

          {isVendor && (
            <form onSubmit={vendorForm.handleSubmit(onVendorSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-8">
              <div>
                <h2 className="text-lg font-semibold">Vendor Profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your business details for equipment listings.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="vendor_company" className="text-sm font-medium">Company Name</label>
                  <input id="vendor_company" {...vendorForm.register("company_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="vendor_city" className="text-sm font-medium">City</label>
                  <input id="vendor_city" {...vendorForm.register("city")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="vendor_state" className="text-sm font-medium">State</label>
                  <input id="vendor_state" {...vendorForm.register("state")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="vendor_gstin" className="text-sm font-medium">GSTIN</label>
                  <input id="vendor_gstin" {...vendorForm.register("gstin")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="vendor_business_type" className="text-sm font-medium">Business Type</label>
                  <input id="vendor_business_type" {...vendorForm.register("business_type")} placeholder="e.g. Proprietorship, Pvt Ltd" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="vendor_description" className="text-sm font-medium">Description</label>
                <textarea
                  id="vendor_description"
                  rows={3}
                  {...vendorForm.register("description")}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {vendorMutation.error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {vendorMutation.error.message}
                </div>
              )}
              {vendorMutation.isSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  Vendor profile updated successfully.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={vendorForm.formState.isSubmitting || vendorMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {vendorForm.formState.isSubmitting || vendorMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Vendor Profile</>
                  )}
                </button>
              </div>
            </form>
          )}

          {isCustomer && (
            <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-8">
              <div>
                <h2 className="text-lg font-semibold">Customer Profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your details used for equipment enquiries.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="customer_company" className="text-sm font-medium">Company Name</label>
                  <input id="customer_company" {...customerForm.register("company_name")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer_designation" className="text-sm font-medium">Designation</label>
                  <input id="customer_designation" {...customerForm.register("designation")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer_city" className="text-sm font-medium">City</label>
                  <input id="customer_city" {...customerForm.register("city")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer_state" className="text-sm font-medium">State</label>
                  <input id="customer_state" {...customerForm.register("state")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              {customerMutation.error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {customerMutation.error.message}
                </div>
              )}
              {customerMutation.isSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  Customer profile updated successfully.
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={customerForm.formState.isSubmitting || customerMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {customerForm.formState.isSubmitting || customerMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Customer Profile</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
