"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, CheckCircle2, Ban, UserCheck, Users, Clock, AlertTriangle, KeyRound } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn, scrollToTop } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

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
  created_at: string;
}

interface UserListResponse {
  results: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
    mutationFn: async (userId: string) => {
      const { data } = await apiClient.post<{ message: string }>(`/admin/users/${userId}/reactivate`);
      return data;
    },
    onSuccess: (res) => {
      setActionMessage({ text: res.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err: any) => {
      setActionMessage({ text: err.message || "Failed to reactivate account.", type: "error" });
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
                            if (
                              confirm(
                                `Reactivate account for ${u.full_name || u.email}?\n\nThis will reset failed attempts, generate a new temporary password (valid for 24 hours), and email it to the user.`
                              )
                            ) {
                              reactivateMutation.mutate(u.id);
                            }
                          }}
                          disabled={reactivateMutation.isPending}
                          className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                          title="Generate new 24-hour temporary password and email to user"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reactivate
                        </button>
                      )}

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
    </div>
  );
}
