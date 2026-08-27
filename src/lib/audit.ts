import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes an immutable audit_logs row as the currently-authenticated
 * staff member. Always call this with the request-scoped server
 * client (never the admin client) so actor_id is provably the real
 * session user — the audit:staff-insert-as-self RLS policy rejects
 * anything else.
 *
 * Never throws: an audit-log failure should never block the
 * underlying action from completing, but it is logged to the server
 * console so it isn't silently lost.
 */
export async function logAudit(
  supabase: SupabaseClient,
  params: {
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    meta: params.meta ?? {},
  });
  if (error) {
    console.error("audit log insert failed", params.action, error);
  }
}
