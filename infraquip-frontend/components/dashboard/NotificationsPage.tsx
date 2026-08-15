"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCheck, Loader2, Bell } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatRelativeTime, cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationsPage() {
  const { data, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await apiClient.get<Notification[]>("/notifications");
      return data;
    },
  });

  const unreadCount = data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-medium">No notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">You'll see updates here when vendors respond to your enquiries or when new features launch.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 transition",
                n.is_read ? "border-border bg-card" : "border-primary/20 bg-primary/5",
              )}
            >
              <div className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                n.is_read ? "bg-transparent" : "bg-primary",
              )} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
