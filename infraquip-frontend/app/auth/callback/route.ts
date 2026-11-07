import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Supabase OAuth Callback Handler
 * Exchanges the OAuth code for a session, then redirects to dashboard.
 * Route: /auth/callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/dashboard";

  // Prevent Open Redirect: must start with a single '/' and not '//' or '/\'
  const safeNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to dashboard or the validated internal route
  return NextResponse.redirect(new URL(safeNext, request.url));
}
