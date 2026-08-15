"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Send, CheckCircle2, User, Building, MapPin, Calendar, Clock } from "lucide-react";
import apiClient from "@/lib/api/client";
import { formatDate, cn } from "@/lib/utils";
import type { Enquiry } from "@/types/enquiry";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function EnquiryThreadClient({ enquiryId }: { enquiryId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");

  const { data: enquiry, isLoading, error } = useQuery<Enquiry, Error>({
    queryKey: ["vendor-enquiry", enquiryId],
    queryFn: async () => {
      const { data } = await apiClient.get<Enquiry>(`/vendor/enquiries/${enquiryId}`);
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/vendor/enquiries/${enquiryId}/reply`, {
        message_text: replyText,
      });
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["vendor-enquiry", enquiryId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <p className="font-medium text-destructive">Failed to load enquiry</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/dashboard/vendor/enquiries")} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border transition-colors hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Enquiry for {enquiry.machine_title || "Equipment"}</h1>
          <p className="text-sm text-muted-foreground">From {enquiry.customer_name} &bull; {formatDate(enquiry.created_at)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        
        {/* Main Thread Area */}
        <div className="space-y-6">
          {/* Messages */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col min-h-[400px]">
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              
              {/* Initial Customer Message (Synthetic Message from requirement) */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {enquiry.customer_name?.[0] || "C"}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{enquiry.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(enquiry.created_at)}</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-muted p-4 text-sm whitespace-pre-line text-foreground">
                    <p className="mb-3 font-medium border-b border-border/50 pb-2">
                      Initial Requirement: {enquiry.requirement_type === "rent" ? "Rent" : "Purchase"}
                    </p>
                    {enquiry.message || "I am interested in this machine. Please contact me with more details."}
                  </div>
                </div>
              </div>

              {/* Thread Messages */}
              {enquiry.messages?.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={cn("flex gap-4", isMe ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold",
                      isMe ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      {isMe ? "Me" : enquiry.customer_name?.[0] || "C"}
                    </div>
                    <div className={cn("space-y-1 max-w-[80%]", isMe ? "text-right" : "")}>
                      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isMe ? "justify-end" : "")}>
                        {!isMe && <span className="font-semibold text-foreground">{enquiry.customer_name}</span>}
                        <span>{formatDate(msg.created_at)}</span>
                        {isMe && msg.is_read && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className={cn(
                        "rounded-2xl p-4 text-sm whitespace-pre-line text-left inline-block",
                        isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
                      )}>
                        {msg.message_text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-border bg-card/50">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (replyText.trim()) mutation.mutate();
                }} 
                className="flex gap-3"
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="flex-1 min-h-[60px] resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                />
                <Button 
                  type="submit" 
                  disabled={!replyText.trim() || mutation.isPending} 
                  className="h-auto w-14 shrink-0 btn-amber-glow p-0 rounded-xl"
                >
                  {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Customer Details</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{enquiry.customer_name}</p>
                </div>
              </div>
              
              {enquiry.customer_company && (
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-muted-foreground">{enquiry.customer_company}</p>
                  </div>
                </div>
              )}
              
              {enquiry.location_of_use && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-muted-foreground">{enquiry.location_of_use}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Requirements</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{enquiry.requirement_type}</span>
              </div>
              
              {enquiry.required_from && (
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">{formatDate(enquiry.required_from)}</span>
                </div>
              )}
              
              {enquiry.required_duration_days && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{enquiry.required_duration_days} days</span>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
