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
    } catch {
      // Backend profile fetch failed, but Supabase session may still be active.
      // Build a minimal user from session metadata so the UI stays consistent
      // with the middleware (which reads the Supabase cookie directly).
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
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
            } as User,
            loading: false,
            error: null,
          });
          return;
        }
      } catch {
        // Supabase session check also failed — treat as guest
      }
      setState({ user: null, loading: false, error: null });
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
