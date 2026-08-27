import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "./types";

export class AuthzError extends Error {}

/**
 * Loads the caller's own profile/role for a server action and asserts
 * it satisfies `roles`. This is a deliberate second check on top of
 * RLS: RLS stops bad *queries*, this stops the server action from
 * even attempting the work and gives a clean error back to the UI
 * instead of a generic Postgres permission-denied.
 */
export async function requireRole(supabase: SupabaseClient, roles: UserRole[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthzError("You must be signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !profile) throw new AuthzError("Profile not found.");
  if (!profile.is_active) throw new AuthzError("This account has been deactivated.");
  if (!roles.includes(profile.role)) throw new AuthzError("You don't have permission to do that.");

  return { userId: user.id, role: profile.role as UserRole };
}

export const STAFF_ROLES: UserRole[] = ["officer", "admin", "super_admin"];
export const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];
