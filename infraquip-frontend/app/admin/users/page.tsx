"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Search, CheckCircle2, Ban, UserCheck, Users, Clock,
  AlertTriangle, KeyRound, Key, Eye, EyeOff, Sparkles, Check, XCircle, AlertCircle
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn, scrollToTop } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getSecureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let val: number;
  do {
    crypto.getRandomValues(array);
    val = array[0];
  } while (val >= limit);
  return val % max;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
  is_banned: boolean;
  is_active: boolean;
  failed_login_attempts?: number;
  reactivation_requested?: boolean;
  reactivation_requested_at?: string | null;
  reactivation_message?: string | null;
  must_change_password?: boolean;
  temp_password_expires_at?: string | null;
  is_temp_password_expired?: boolean;
  created_at: string;
}

interface UserListResponse {
  results: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── Modal for Reactivation / Reissuing Temporary Password with Manual Option ──
function UserTempPasswordModal({
  user,
  action,
  onClose,
  onConfirm,
  loading,
  error,
}: {
  user: AdminUser;
  action: "reactivate" | "reissue";
  onClose: () => void;
  onConfirm: (tempPassword?: string) => void;
  loading: boolean;
  error?: string | null;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manualPassword, setManualPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const generateRandomPassword = () => {
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const specials = "@#$!%*?";
    const all = uppers + lowers + digits + specials;
    const parts = [
      uppers[getSecureRandomInt(uppers.length)],
      uppers[getSecureRandomInt(uppers.length)],
      lowers[getSecureRandomInt(lowers.length)],
      lowers[getSecureRandomInt(lowers.length)],
      digits[getSecureRandomInt(digits.length)],
      digits[getSecureRandomInt(digits.length)],
      specials[getSecureRandomInt(specials.length)],
      specials[getSecureRandomInt(specials.length)],
    ];
    while (parts.length < 12) {
      parts.push(all[getSecureRandomInt(all.length)]);
    }
    for (let i = parts.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1);
      [parts[i], parts[j]] = [parts[j], parts[i]];
    }
    setManualPassword(parts.join(""));
    setShowPassword(true);
  };

  const hasLength = manualPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(manualPassword);
  const hasLower = /[a-z]/.test(manualPassword);
  const hasNumber = /[0-9]/.test(manualPassword);
  const isManualValid = hasLength && hasUpper && hasLower && hasNumber;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mode === "manual") {
      if (!isManualValid || loading) return;
      onConfirm(manualPassword.trim());
    } else {
      if (loading) return;
      onConfirm(undefined);
    }
  };

  const title = action === "reactivate" ? "Reactivate Account" : "Issue Temporary Password";
  const desc =
    action === "reactivate"
      ? "Reset failed login attempts, restore account access, and deliver temporary credentials."
      : "Issue a fresh 24-hour temporary login password to the user.";

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent
        className="w-full max-w-lg p-6 space-y-5 rounded-2xl"
        onPointerDownOutside={(e) => { if (loading) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (loading) e.preventDefault(); }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">{desc}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User info */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{user.full_name || "User"}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-primary/10 text-primary">
              {user.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Temporary Password Generation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMode("auto")}
              className={cn(
                "flex flex-col text-left p-3 rounded-xl border text-xs transition",
                mode === "auto"
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <span className="font-semibold text-foreground flex items-center justify-between">
                Auto-generate
                {mode === "auto" && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span className="mt-1 text-[11px] leading-relaxed">
                Creates a secure 12-char password automatically.
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("manual");
                if (!manualPassword) generateRandomPassword();
              }}
              className={cn(
                "flex flex-col text-left p-3 rounded-xl border text-xs transition",
                mode === "manual"
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <span className="font-semibold text-foreground flex items-center justify-between">
                Set Manually
                {mode === "manual" && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span className="mt-1 text-[11px] leading-relaxed">
                Provide or customize a specific temporary password.
              </span>
            </button>
          </div>
        </div>

        {/* Manual Input */}
        {mode === "manual" && (
          <div className="space-y-3 pt-1 animate-in fade-in">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Manual Temporary Password
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="h-3 w-3" /> Auto-suggest strong
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="Enter temporary password..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border/50">
              <div className={cn("flex items-center gap-1.5", hasLength ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                <Check className={cn("h-3 w-3", hasLength ? "text-emerald-500" : "opacity-40")} />
                8+ characters
              </div>
              <div className={cn("flex items-center gap-1.5", hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                <Check className={cn("h-3 w-3", hasUpper ? "text-emerald-500" : "opacity-40")} />
                1 uppercase letter
              </div>
              <div className={cn("flex items-center gap-1.5", hasLower ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                <Check className={cn("h-3 w-3", hasLower ? "text-emerald-500" : "opacity-40")} />
                1 lowercase letter
              </div>
              <div className={cn("flex items-center gap-1.5", hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground")}>
                <Check className={cn("h-3 w-3", hasNumber ? "text-emerald-500" : "opacity-40")} />
                1 number (0-9)
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          The temporary password is valid for 24 hours. The user must set their permanent password upon logging in.
        </p>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition cursor-pointer"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            disabled={loading || (mode === "manual" && !isManualValid)}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><KeyRound className="h-4 w-4 mr-1" /> Confirm & Send</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [tempPasswordTarget, setTempPasswordTarget] = useState<{
    user: AdminUser;
    action: "reactivate" | "reissue";
  } | null>(null);

  const { data, isLoading } = useQuery<UserListResponse>({
    queryKey: ["admin-users-list", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (search.trim()) params.set("search", search.trim());
      const { data } = await apiClient.get<UserListResponse>(`/admin/users?${params}`);
      return data;
    },
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiClient.put(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
  });

  const toggleBanMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.patch(`/admin/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async ({ userId, tempPassword }: { userId: string; tempPassword?: string }) => {
      const { data } = await apiClient.post<{ message: string }>(
        `/admin/users/${userId}/reactivate`,
        tempPassword ? { temp_password: tempPassword } : {}
      );
      return data;
    },
    onSuccess: (res) => {
      setActionMessage({ text: res.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      setTempPasswordTarget(null);
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err: any) => {
      setActionMessage({ text: err?.response?.data?.detail || err.message || "Failed to reactivate account.", type: "error" });
      setTimeout(() => setActionMessage(null), 6000);
    },
  });

  const reissueTempPasswordMutation = useMutation({
    mutationFn: async ({ userId, tempPassword }: { userId: string; tempPassword?: string }) => {
      const { data } = await apiClient.post<{ message: string }>(
        `/admin/users/${userId}/reissue-temp-password`,
        tempPassword ? { temp_password: tempPassword } : {}
      );
      return data;
    },
    onSuccess: (res) => {
      setActionMessage({ text: res.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      setTempPasswordTarget(null);
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err: any) => {
      setActionMessage({ text: err?.response?.data?.detail || err.message || "Failed to reissue temporary password.", type: "error" });
      setTimeout(() => setActionMessage(null), 6000);
    },
  });

  const users = data?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} user${data.total !== 1 ? "s" : ""} registered` : "Manage user roles and account status."}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            suppressHydrationWarning
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {actionMessage && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm flex items-center justify-between transition-all",
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          )}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !users.length ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={search ? "No users matched your search criteria." : "There are currently no users registered on the platform."}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-muted/20">
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{u.full_name || "---"}</span>
                        {u.is_verified && (
                          <span title="Verified User">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          </span>
                        )}
                      </div>
                      {u.reactivation_requested && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Reactivation Requested
                          </span>
                          {u.reactivation_message && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-xs" title={u.reactivation_message}>
                              &quot;{u.reactivation_message}&quot;
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        u.role === "admin" && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                        u.role === "vendor" && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                        u.role === "broker" && "bg-violet-500/10 text-violet-500 border border-violet-500/20",
                        u.role === "customer" && "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      )}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          Blocked {(u.failed_login_attempts ?? 0) >= 4 ? "(4 Failed Attempts)" : ""}
                        </span>
                      ) : !u.is_verified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                          <Clock className="h-3 w-3" />
                          Unverified (Pending 1st Login)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active / Verified
                        </span>
                      )}
                      {!u.is_banned && (u.failed_login_attempts ?? 0) > 0 && (
                        <span className="text-[10px] text-amber-500/90 font-medium">
                          {u.failed_login_attempts}/4 failed attempts
                        </span>
                      )}
                      {u.is_temp_password_expired ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Temp Pwd Expired
                        </span>
                      ) : u.must_change_password && u.temp_password_expires_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                          <Clock className="h-3 w-3" />
                          Temp Pwd Active
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{formatRelativeTime(u.created_at)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={u.role}
                        onChange={(e) => toggleRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                        className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium focus:border-primary focus:outline-none"
                      >
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                        <option value="broker">Broker</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Reactivate Button */}
                      {(u.is_banned || u.reactivation_requested) && (
                        <button
                          onClick={() => {
                            setActionMessage(null);
                            setTempPasswordTarget({ user: u, action: "reactivate" });
                          }}
                          disabled={reactivateMutation.isPending || reissueTempPasswordMutation.isPending}
                          className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                          title="Reactivate user with auto or manual temporary password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reactivate
                        </button>
                      )}

                      {/* Reissue Temporary Password Button */}
                      <button
                        onClick={() => {
                          setActionMessage(null);
                          setTempPasswordTarget({ user: u, action: "reissue" });
                        }}
                        disabled={reissueTempPasswordMutation.isPending || reactivateMutation.isPending}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                          u.is_temp_password_expired
                            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                        )}
                        title="Generate or manually set and email a fresh 24-hour temporary password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {u.is_temp_password_expired ? "Reissue Expired Pwd" : "Send Temp Pwd"}
                      </button>

                      <button
                        onClick={() => {
                          const action = u.is_banned ? "unban" : "ban";
                          if (confirm(`Are you sure you want to ${action} ${u.full_name || u.email}?`)) {
                            toggleBanMutation.mutate(u.id);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                          u.is_banned
                            ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                            : "border-destructive/30 text-destructive hover:bg-destructive/10"
                        )}
                        title={u.is_banned ? "Unban account" : "Ban account"}
                      >
                        {u.is_banned ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Unban
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            Ban
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-4">
              <span className="text-xs text-muted-foreground">
                Page {data.page} of {data.total_pages}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPage(p);
                      scrollToTop();
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer",
                      page === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tempPasswordTarget && (
        <UserTempPasswordModal
          user={tempPasswordTarget.user}
          action={tempPasswordTarget.action}
          onClose={() => setTempPasswordTarget(null)}
          error={actionMessage?.type === "error" ? actionMessage.text : null}
          loading={
            tempPasswordTarget.action === "reactivate"
              ? reactivateMutation.isPending
              : reissueTempPasswordMutation.isPending
          }
          onConfirm={(tempPassword) => {
            if (tempPasswordTarget.action === "reactivate") {
              reactivateMutation.mutate({
                userId: tempPasswordTarget.user.id,
                tempPassword,
              });
            } else {
              reissueTempPasswordMutation.mutate({
                userId: tempPasswordTarget.user.id,
                tempPassword,
              });
            }
          }}
        />
      )}
    </div>
  );
}
