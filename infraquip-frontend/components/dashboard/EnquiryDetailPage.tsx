"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Send, ArrowLeft, Calendar, MapPin, Building2, Clock, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface EnquiryDetail {
  id: string;
  requirement_type: string;
  customer_company?: string;
  required_from?: string;
  required_duration_days?: number;
  location_of_use?: string;
  message?: string;
  status: string;
  created_at: string;
  machine_title?: string;
  customer_name?: string;
  machine_id?: string;
  messages: {
    id: string;
    sender_id: string;
    message_text: string;
    created_at: string;
  }[];
}

export function EnquiryDetailPage({ enquiryId }: { enquiryId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState("");

  const { data: enquiry, isLoading, error } = useQuery<EnquiryDetail>({
    queryKey: ["enquiry", enquiryId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/enquiries/${enquiryId}`);
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiClient.post(`/enquiries/${enquiryId}/messages`, { message_text: text });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["enquiry", enquiryId] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
        Failed to load enquiry.
        <button onClick={() => router.back()} className="ml-2 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{enquiry.customer_name || "Customer"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Re: {enquiry.machine_title || "General Enquiry"}
            </p>
          </div>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            enquiry.status === "pending" && "bg-amber-500/10 text-amber-500",
            enquiry.status === "replied" && "bg-blue-500/10 text-blue-500",
            enquiry.status === "closed" && "bg-muted text-muted-foreground",
          )}>
            {enquiry.status}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {enquiry.requirement_type && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {enquiry.requirement_type === "rent" ? "Wants to rent" : "Wants to buy"}
            </div>
          )}
          {enquiry.customer_company && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {enquiry.customer_company}
            </div>
          )}
          {enquiry.required_from && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Needed from {enquiry.required_from}
              {enquiry.required_duration_days && ` for ${enquiry.required_duration_days} day${enquiry.required_duration_days > 1 ? "s" : ""}`}
            </div>
          )}
          {enquiry.location_of_use && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {enquiry.location_of_use}
            </div>
          )}
        </div>

        {enquiry.message && (
          <div className="mt-4 rounded-xl bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground">Their message:</p>
            <p className="mt-1 text-sm">{enquiry.message}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Messages</h2>

        <div className="mt-4 space-y-3">
          {enquiry.messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
          ) : (
            enquiry.messages.map((msg) => {
              const isMe = user?.id === msg.sender_id;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    isMe ? "bg-primary/10 text-foreground" : "bg-muted",
                  )}>
                    <p className="text-sm">{msg.message_text}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatRelativeTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {enquiry.status !== "closed" && (
          <form onSubmit={handleSend} className="mt-6 flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="message" className="sr-only">Type a message</label>
              <textarea
                id="message"
                rows={2}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your reply..."
                className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              aria-label="Send message"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
