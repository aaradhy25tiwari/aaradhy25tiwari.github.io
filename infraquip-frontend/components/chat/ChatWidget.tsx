"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, MessageSquare, X, CheckCheck } from "lucide-react";
import apiClient from "@/lib/api/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

interface ChatWidgetProps {
  enquiryId: string;
  currentUserId: string;
  vendorId: string;
  customerId: string;
}

export function ChatWidget({ enquiryId, currentUserId, vendorId, customerId }: ChatWidgetProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load existing messages
  const { data: enquiry } = useQuery({
    queryKey: ["enquiry", enquiryId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/enquiries/${enquiryId}`);
      return data;
    },
  });

  useEffect(() => {
    if (enquiry?.messages) {
      setMessages(enquiry.messages);
    }
  }, [enquiry?.messages]);

  // Connect WebSocket
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const connect = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//localhost:8000`;
        const url = `${host}/api/v1/chat/ws/${enquiryId}?token=${session.access_token}`;

        socket = new WebSocket(url);
        wsRef.current = socket;

        socket.onopen = () => {
          if (mounted) {
            setConnected(true);
            setWs(socket);
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "message") {
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.id)) return prev;
                return [...prev, {
                  id: data.id,
                  sender_id: data.sender_id,
                  message_text: data.message,
                  created_at: data.created_at,
                }];
              });
            }
          } catch {}
        };

        socket.onclose = () => {
          if (mounted) {
            setConnected(false);
            setWs(null);
            wsRef.current = null;
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enquiryId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ message: text }));
    setInput("");
  }, [input, ws]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isVendor = currentUserId === vendorId;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-border bg-card shadow-lg transition-all",
      minimized ? "h-14" : "h-[480px]",
    )}>
      {/* Header */}
      <button
        onClick={() => setMinimized(!minimized)}
        className="flex w-full items-center justify-between rounded-t-2xl border-b border-border bg-muted/50 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Chat</span>
          {connected && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected" />}
        </div>
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: "340px" }}>
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}>
                    <p>{msg.message_text}</p>
                    <p className={cn("mt-1 text-[10px]", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                      {formatRelativeTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
              className="rounded-xl bg-primary p-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
