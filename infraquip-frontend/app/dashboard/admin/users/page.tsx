"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/users");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage platform users.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No users yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u: any) => (
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
                  <td className="p-4 text-muted-foreground">{formatRelativeTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
