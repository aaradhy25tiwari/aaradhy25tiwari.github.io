"use client";

import dynamic from "next/dynamic";

const ChatbotWidget = dynamic(
  () => import("@/components/chat/ChatbotWidget").then((mod) => ({ default: mod.ChatbotWidget })),
  { ssr: false },
);

export function ChatbotWrapper() {
  return <ChatbotWidget />;
}
