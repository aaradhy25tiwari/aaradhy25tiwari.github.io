"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@/types/user";
import apiClient from "@/lib/api/client";
import { redirectIfProtectedPath } from "@/lib/auth/redirect";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Fetch full user profile from our backend
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get<User>("/auth/me");
      setState({ user: data, loading: false, error: null });
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      // If the backend explicitly rejects the account (401 or 403), perform session cleanup and do not fall back
      if (status === 401 || status === 403) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        setState({ user: null, loading: false, error: null });
        return;
      }
      // Backend profile fetch failed due to network timeout or server error.
      // Fallback: read from local session so we don't log them out if session is still good
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth
          .getSession()
          .catch((e) => ({ data: { session: null }, error: e }));

        if (sessionError) {
          // A rejected lookup is NOT confirmed session absence.
          // Preserve any existing authenticated user and expose a recoverable error.
          setState((prev) => ({
            user: prev.user,
            loading: false,
            error: err?.message || "Session verification error",
          }));
          return;
        }

        const session = sessionData?.session;
        if (session?.user) {
          const sbUser = session.user;
          const meta = sbUser.user_metadata ?? {};
          setState({
            user: {
              id: sbUser.id,
              email: sbUser.email ?? "",
              full_name: meta.full_name ?? meta.name ?? "User",
              phone: meta.phone ?? sbUser.phone ?? "",
              role: meta.role ?? "customer",
              avatar_url: meta.avatar_url ?? null,
              is_active: true,
            } as unknown as User,
            loading: false,
            error: null,
          });
          return;
        }

        // Confirmed session absence (session is null and no sessionError)
        setState({ user: null, loading: false, error: null });
      } catch (fallbackErr) {
        console.debug("Local session fallback error:", fallbackErr);
        setState((prev) => ({
          user: prev.user,
          loading: false,
          error: err?.message || "Session verification error",
        }));
      }
    }
  }, [supabase.auth]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Clear invalid stale session locally and notify subscribers
        supabase.auth.signOut({ scope: "local" }).catch(() => {});
        setState({ user: null, loading: false, error: null });
      } else if (session) {
        fetchUser();
      } else {
        // Confirmed session absence
        setState({ user: null, loading: false, error: null });
      }
    }).catch(() => {
      // Inconclusive initial probe: remain in neutral unknown/error state without clearing pre-existing user
      setState((prev) => ({
        user: prev.user,
        loading: false,
        error: "Failed to initialize session.",
      }));
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await fetchUser();
        } else if (event === "SIGNED_OUT") {
          setState({ user: null, loading: false, error: null });
          redirectIfProtectedPath();
        } else if (event === "TOKEN_REFRESHED" && session) {
          // Silently update — user state unchanged
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUser, supabase.auth]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
    setState({ user: null, loading: false, error: null });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.push("/");
    }
  }, [supabase.auth, router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    isVendor: state.user?.role === "vendor",
    isCustomer: state.user?.role === "customer",
    isBroker: state.user?.role === "broker",
    isAdmin: state.user?.role === "admin",
    signOut,
    refreshUser,
  };
}
