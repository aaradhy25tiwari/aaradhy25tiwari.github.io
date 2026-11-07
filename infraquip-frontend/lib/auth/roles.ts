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
    // Authoritative lookup: match Supabase auth UID to users.auth_uid
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", user.id)
      .maybeSingle();

    if (error) {
      console.error("Database error querying user role by auth_uid:", error);
    } else if (data?.role && isAllowedRole(data.role)) {
      return data.role;
    }

    // Fallback: check legacy records where users.id equals auth UID
    if (!data) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (legacyError) {
        console.error("Database error querying user role by legacy id:", legacyError);
      } else if (legacyData?.role && isAllowedRole(legacyData.role)) {
        return legacyData.role;
      }
    }
  } catch (err) {
    console.error("Unexpected error querying user role from database:", err);
  }

  // Safe fallback
  return "customer";
}

