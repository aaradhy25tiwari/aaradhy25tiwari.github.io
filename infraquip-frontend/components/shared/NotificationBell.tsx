"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, ArrowRight, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api/client";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function typeIcon(type: string) {
  switch (type) {
    case "enquiry": return "📬";
    case "approved": return "✅";
    case "rejected": return "❌";
    case "payment": return "💳";
    case "message": return "💬";
    default: return "🔔";
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await apiClient.get<Notification[]>("/notifications");
      return data;
    },
    refetchInterval: 30_000, // Poll every 30 s
    staleTime: 20_000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="relative">
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </Button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-[100] w-80 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    disabled={markAllRead.isPending}
                  >
                    {markAllRead.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3 w-3" />
                    )}
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markRead.mutate(n.id);
                        if (n.link) window.location.href = n.link;
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        !n.is_read && "bg-primary/5"
                      )}
                    >
                      <span className="text-lg leading-none mt-0.5 flex-shrink-0">
                        {typeIcon(n.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", !n.is_read && "font-semibold")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-3">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
                >
                  View all notifications
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
