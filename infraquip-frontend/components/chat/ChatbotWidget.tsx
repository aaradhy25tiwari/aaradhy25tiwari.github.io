"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Send, Bot, X, Sparkles } from "lucide-react";
import apiClient from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  listings?: any[];
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm InfraQuip AI. I can help you find equipment, answer questions about the platform, or guide you through the enquiry process. What do you need help with?",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const { data } = await apiClient.post("/chatbot", {
        message: userMessage,
        conversation_history: history,
      });
      return data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, listings: data.listings },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again." },
      ]);
    },
  });

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    chatMutation.mutate(text);
  }, [input, chatMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-24 lg:bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
          open ? "bg-muted-foreground scale-90" : "bg-primary hover:bg-primary/90",
        )}
        aria-label="Toggle AI assistant"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-primary-foreground" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 lg:bottom-20 right-4 z-40 flex w-80 flex-col rounded-2xl border border-border bg-card shadow-2xl" style={{ height: "520px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-primary px-4 py-3 text-primary-foreground">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">InfraQuip AI</p>
              <p className="text-[10px] opacity-70">Ask me anything about equipment</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.listings && msg.listings.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
                      {msg.listings.map((listing: any, li: number) => (
                        <a
                          key={li}
                          href={`/machines/${listing.slug}`}
                          className="block rounded-lg bg-background/50 p-2 text-xs hover:bg-background/80"
                        >
                          <p className="font-medium">{listing.make} {listing.model}</p>
                          <p className="text-muted-foreground">{listing.city} · ₹{listing.rental_price_daily}/day</p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about equipment..."
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || chatMutation.isPending}
              className="rounded-xl bg-primary p-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
