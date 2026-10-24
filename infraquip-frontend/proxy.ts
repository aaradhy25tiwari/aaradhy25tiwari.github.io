import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/admin"];
// Routes only for guests (redirect if already logged in)
const GUEST_ONLY_ROUTES = ["/login", "/register"];

function isAuthInvalidError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const error = err as { status?: number; code?: string; name?: string; message?: string };
  // HTTP 400 or 401 strongly indicates invalid credentials or expired/invalid refresh token
  if (error.status === 400 || error.status === 401) {
    return true;
  }
  const code = (error.code || error.name || "").toLowerCase();
  const message = (error.message || "").toLowerCase();
  return (
    code.includes("session_not_found") ||
    code.includes("refreshtokennotfound") ||
    code.includes("invalidrefreshtoken") ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("jwt expired")
  );
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const deletedCookies = new Set<string>();

  const clearStaleCookies = () => {
    const allCookies = request.cookies.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        supabaseResponse.cookies.delete(cookie.name);
        request.cookies.delete(cookie.name);
        deletedCookies.add(cookie.name);
      }
    });
  };

  const createRedirectResponse = (url: URL | string) => {
    const targetUrl = typeof url === "string" ? new URL(url, request.url) : url;
    const redirectResponse = NextResponse.redirect(targetUrl);

    // Apply all cookies from supabaseResponse (including updated session tokens)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    // Explicitly apply deleted cookies to the redirect response
    deletedCookies.forEach((name) => {
      redirectResponse.cookies.delete(name);
    });

    return redirectResponse;
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for cookie-based session handling)
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    } else if (error) {
      // Only clear cookies if the error is a permanent auth invalidation,
      // keeping valid sessions intact on transient lookup failures (e.g., 5xx or network drops).
      if (isAuthInvalidError(error)) {
        clearStaleCookies();
      }
    }
  } catch (authError) {
    // Only clear stale cookies if confirmed to be an invalid auth error rather than a transient network failure
    if (isAuthInvalidError(authError)) {
      clearStaleCookies();
    }
    user = null;
  }

  const path = request.nextUrl.pathname;

  // Protect dashboard routes
  if (PROTECTED_ROUTES.some((route) => path.startsWith(route) || path === route) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return createRedirectResponse(redirectUrl);
  }

  // Redirect logged-in users away from login/register
  if (GUEST_ONLY_ROUTES.includes(path) && user) {
    const role = user.user_metadata?.role || "customer";
    const redirectTarget = role === "admin" ? "/admin" : `/dashboard/${role}`;
    return createRedirectResponse(new URL(redirectTarget, request.url));
  }

  // Handle generic /dashboard access
  if (user && path === "/dashboard") {
    const role = user.user_metadata?.role || "customer";
    const redirectTarget = role === "admin" ? "/admin" : `/dashboard/${role}`;
    return createRedirectResponse(new URL(redirectTarget, request.url));
  }

  // Enforce role separation for dashboards
  if (user && path.startsWith("/dashboard/")) {
    const role = user.user_metadata?.role || "customer";
    // Admins have access to /admin, not /dashboard/admin (per page map)
    if (role === "admin") {
      return createRedirectResponse(new URL("/admin", request.url));
    }
    // Vendors, Brokers, Customers must stay in their own namespace
    if (!path.startsWith(`/dashboard/${role}`)) {
      return createRedirectResponse(new URL(`/dashboard/${role}`, request.url));
    }
  }

  // Enforce admin-only access for /admin routes
  if (user && path.startsWith("/admin") && user.user_metadata?.role !== "admin") {
    const role = user.user_metadata?.role || "customer";
    return createRedirectResponse(new URL(`/dashboard/${role}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all paths except static files, API routes, _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
