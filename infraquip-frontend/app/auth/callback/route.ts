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
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to dashboard or the intended route
  return NextResponse.redirect(new URL(next, request.url));
}
