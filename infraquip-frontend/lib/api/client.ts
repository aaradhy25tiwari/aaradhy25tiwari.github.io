import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { getSupabaseClient } from "@/lib/supabase/client";

console.log("API URL IS:", process.env.NEXT_PUBLIC_API_URL);
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  timeout: 15000,
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

// ── Response Interceptor: normalize errors ────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail: string | { msg: string }[] }>) => {
    const status = error.response?.status;

    // Token expired — attempt refresh
    if (status === 401) {
      try {
        const supabase = getSupabaseClient();
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && data.session) {
          // Retry original request with new token
          const originalConfig = error.config as AxiosRequestConfig;
          originalConfig.headers = {
            ...originalConfig.headers,
            Authorization: `Bearer ${data.session.access_token}`,
          };
          return apiClient(originalConfig);
        }
      } catch {
        // Refresh failed — let the error propagate
      }
    }

    // Normalize error message
    const detail = error.response?.data?.detail;
    let message = "Something went wrong. Please try again.";

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail[0].msg;
    } else if (error.message === "Network Error") {
      message = "Unable to connect. Please check your internet connection.";
    } else if (error.code === "ECONNABORTED") {
      message = "Request timed out. Please try again.";
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
