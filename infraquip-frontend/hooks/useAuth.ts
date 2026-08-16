"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@/types/user";
import apiClient from "@/lib/api/client";

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
      // Backend profile fetch failed (likely network timeout).
      // Fallback: read from local session so we don't log them out!
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
      } catch (fallbackErr) {
        console.error("Local session fallback also failed", fallbackErr);
      }
      
      // If we completely failed to get any session, then we clear
      setState((prev) => ({ ...prev, loading: false, error: "Network error" }));
    }
  }, [supabase.auth]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUser();
      } else {
        setState({ user: null, loading: false, error: null });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await fetchUser();
        } else if (event === "SIGNED_OUT") {
          setState({ user: null, loading: false, error: null });
        } else if (event === "TOKEN_REFRESHED" && session) {
          // Silently update — user state unchanged
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUser, supabase.auth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
    router.push("/");
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
