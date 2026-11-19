import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { getSupabaseClient } from "@/lib/supabase/client";
import { redirectIfProtectedPath } from "@/lib/auth/redirect";

// Ensure server-side rendering uses an absolute URL for the API
const isServer = typeof window === "undefined";
const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
const baseURL = isServer && apiBase.startsWith("/") 
  ? `http://127.0.0.1:8000${apiBase}`
  : apiBase;

console.log("API URL IS:", baseURL);

const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Request Interceptor: attach Supabase JWT ──────────────────
apiClient.interceptors.request.use(async (config) => {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // No session, proceed unauthenticated (guest mode)
  }
  return config;
});

// Mutex promise to deduplicate concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;

async function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth
          .getSession()
          .catch(() => ({ data: { session: null }, error: null }));

        if (!session) {
          redirectIfProtectedPath();
          return null;
        }

        const { data, error } = await supabase.auth
          .refreshSession()
          .catch((err) => ({ data: { session: null }, error: err }));

        if (!error && data?.session?.access_token) {
          return data.session.access_token;
        }

        // Refresh failed or token invalid — clean up session and notify auth subscribers
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }

        redirectIfProtectedPath();
        return null;
      } catch (e) {
        console.debug("Session refresh exception caught:", e);
        try {
          const supabase = getSupabaseClient();
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        redirectIfProtectedPath();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// ── Response Interceptor: normalize errors ────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail: string | { msg: string }[] }>) => {
    const status = error.response?.status;
    const originalConfig = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Token expired / Unauthorized — attempt single-flight refresh
    if (status === 401) {
      if (originalConfig && !originalConfig._retry) {
        originalConfig._retry = true;
        const newToken = await getRefreshedToken();
        if (newToken) {
          originalConfig.headers = {
            ...originalConfig.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return apiClient(originalConfig);
        }
      } else if (originalConfig?._retry) {
        // Terminal 401: user account rejected even with refreshed session
        try {
          const supabase = getSupabaseClient();
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        redirectIfProtectedPath();
      }
    }

    // Normalize error message
    const detail = error.response?.data?.detail;
    let message = "Something went wrong. Please try again.";

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail[0].msg;
    } else if (error.message === "Network Error" || error.message === "Failed to fetch") {
      message = "Unable to connect. Please check your internet connection.";
    } else if (error.code === "ECONNABORTED") {
      message = "Request timed out. Please try again.";
    }

    const normalizedError = Object.assign(new Error(message), {
      response: error.response,
      status: status,
      code: error.code,
    });

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
