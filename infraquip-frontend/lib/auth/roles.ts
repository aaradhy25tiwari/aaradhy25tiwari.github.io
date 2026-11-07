export const ALLOWED_ROLES = ["customer", "vendor", "broker", "admin"] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export function isAllowedRole(role: unknown): role is AllowedRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as AllowedRole);
}

/**
 * Retrieves the trusted role for an authenticated Supabase user.
 * 1. Checks `app_metadata.role` (managed securely by server-side / auth admin).
 * 2. Queries the database `users` table for the authoritative role.
 * 3. Defaults to "customer" as the safe fallback when trusted sources are unavailable.
 */
export async function getTrustedUserRole(
  supabase: any,
  user: { id: string; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> }
): Promise<AllowedRole> {
  // 1. Check trusted app_metadata
  const appRole = user.app_metadata?.role;
  if (isAllowedRole(appRole)) {
    return appRole;
  }

  // 2. Query authoritative users table in database
  try {
    const { data } = await supabase
      .from("users")
      .select("role")
      .or(`auth_uid.eq.${user.id},id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();

    if (data?.role && isAllowedRole(data.role)) {
      return data.role;
    }
  } catch {
    // DB query failed or table not directly accessible via anon client
  }

  // Safe fallback
  return "customer";
}

