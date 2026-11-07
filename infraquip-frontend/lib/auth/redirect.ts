/**
 * Checks whether a given pathname is a protected dashboard or admin path.
 * Matches only `/admin` and `/dashboard` themselves or paths beneath those segments.
 */
export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  );
}

/**
 * Redirects the browser if the current window location is on a protected route
 * (/admin or /dashboard or subpaths beneath them).
 * Defaults to the guest home page ("/") as requested when session ends.
 */
export function redirectIfProtectedPath(target: string = "/"): boolean {
  if (typeof window !== "undefined" && isProtectedPath(window.location.pathname)) {
    window.location.href = target;
    return true;
  }
  return false;
}

