"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "infraquip_cookie_consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Show after a brief delay for smoother initial load
        const timer = setTimeout(() => setShow(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage may fail in restricted iframe / incognito
    }
  }, []);

  const handleConsent = (choice: "accepted" | "declined") => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-5 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mt-0.5">
          <Cookie className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Cookie &amp; Privacy Choices
            </h3>
            <button
              onClick={() => handleConsent("declined")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            We use necessary and analytical cookies to improve performance, remember your preferences, and analyze equipment marketplace trends under India&apos;s DPDP Act 2023.
          </p>

          <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Link href="/cookies" className="text-primary hover:underline font-medium">
                Cookie Policy
              </Link>
              <span>·</span>
              <Link href="/privacy" className="text-primary hover:underline font-medium">
                Privacy
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConsent("declined")}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Essential Only
              </Button>
              <Button
                size="sm"
                onClick={() => handleConsent("accepted")}
                className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
