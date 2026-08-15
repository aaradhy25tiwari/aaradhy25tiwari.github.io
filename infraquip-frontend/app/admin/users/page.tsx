"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, Users } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminUser[]>("/admin/users");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage user roles and account status.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No users</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-4 font-medium">{u.full_name || "---"}</td>
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4">
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                      u.role === "admin" && "bg-rose-500/10 text-rose-500",
                      u.role === "vendor" && "bg-amber-500/10 text-amber-500",
                      u.role === "broker" && "bg-violet-500/10 text-violet-500",
                      u.role === "customer" && "bg-blue-500/10 text-blue-500",
                    )}>{u.role}</span>
                  </td>
                  <td className="p-4">
                    <span className={u.is_active ? "text-emerald-500" : "text-muted-foreground"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{formatRelativeTime(u.created_at)}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => toggleRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="broker">Broker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
