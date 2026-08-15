"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

// Simple in-memory store for toasts
let toastStore: ToastItem[] = [];
let listeners: Array<(toasts: ToastItem[]) => void> = [];

function addToast(toast: Omit<ToastItem, "id">) {
  const id = Math.random().toString(36).slice(2);
  const newToast = { ...toast, id };
  toastStore = [...toastStore, newToast];
  listeners.forEach((l) => l(toastStore));

  // Auto-dismiss
  setTimeout(() => {
    toastStore = toastStore.filter((t) => t.id !== id);
    listeners.forEach((l) => l(toastStore));
  }, toast.duration ?? 5000);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(toastStore);

  const subscribe = useCallback(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  // Subscribe on mount
  useState(() => {
    return subscribe();
  });

  const toast = useCallback((props: Omit<ToastItem, "id">) => {
    addToast(props);
  }, []);

  return { toasts, toast };
}

// Standalone toast function for use outside components
export const toast = (props: Omit<ToastItem, "id">) => addToast(props);
