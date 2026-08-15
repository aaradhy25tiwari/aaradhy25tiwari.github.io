import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/admin"];
// Routes only for guests (redirect if already logged in)
const GUEST_ONLY_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protect dashboard routes
  if (PROTECTED_ROUTES.some((route) => path.startsWith(route) || path === route) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect logged-in users away from login/register
  if (GUEST_ONLY_ROUTES.includes(path) && user) {
    const role = user.user_metadata?.role || "customer";
    const redirectTarget = role === "admin" ? "/admin" : `/dashboard/${role}`;
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  // Handle generic /dashboard access
  if (user && path === "/dashboard") {
    const role = user.user_metadata?.role || "customer";
    const redirectTarget = role === "admin" ? "/admin" : `/dashboard/${role}`;
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  // Enforce role separation for dashboards
  if (user && path.startsWith("/dashboard/")) {
    const role = user.user_metadata?.role || "customer";
    // Admins have access to /admin, not /dashboard/admin (per page map)
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    // Vendors, Brokers, Customers must stay in their own namespace
    if (!path.startsWith(`/dashboard/${role}`)) {
      return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
    }
  }

  // Enforce admin-only access for /admin routes
  if (user && path.startsWith("/admin") && user.user_metadata?.role !== "admin") {
    const role = user.user_metadata?.role || "customer";
    return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all paths except static files, API routes, _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
