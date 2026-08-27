"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, ADMIN_ROLES, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  const supabase = await createClient();
  try {
    const auth = await requireRole(supabase, ADMIN_ROLES);
    return { supabase, auth, error: null };
  } catch (e) {
    return { supabase, auth: null, error: e instanceof AuthzError ? e.message : "Something went wrong." };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Officer / citizen management
// ─────────────────────────────────────────────────────────────────────

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["citizen", "officer", "admin", "super_admin"]),
});

export async function updateUserRole(input: z.infer<typeof roleSchema>): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  if (parsed.data.userId === auth.userId) {
    return { ok: false, error: "You can't change your own role." };
  }
  if (["admin", "super_admin"].includes(parsed.data.role) && auth.role !== "super_admin") {
    return { ok: false, error: "Only a super_admin can grant admin or super_admin." };
  }

  // The DB trigger enforce_role_change_authority re-checks both of the
  // above server-side regardless of this application-layer check.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);
  if (updateError) return { ok: false, error: updateError.message || "Couldn't update the role." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "profile.role_change",
    entityType: "profile",
    entityId: parsed.data.userId,
    meta: { role: parsed.data.role },
  });

  revalidatePath("/admin/officers");
  revalidatePath("/admin/citizens");
  return { ok: true };
}

const activeSchema = z.object({ userId: z.string().uuid(), isActive: z.boolean() });

export async function setUserActive(input: z.infer<typeof activeSchema>): Promise<ActionResult> {
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };
  if (parsed.data.userId === auth.userId) return { ok: false, error: "You can't deactivate your own account." };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.userId);
  if (updateError) return { ok: false, error: "Couldn't update account status." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: parsed.data.isActive ? "profile.activate" : "profile.deactivate",
    entityType: "profile",
    entityId: parsed.data.userId,
  });

  revalidatePath("/admin/officers");
  revalidatePath("/admin/citizens");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Violation categories
// ─────────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
  nameEn: z.string().min(2).max(150),
  nameBn: z.string().min(2).max(150),
  descriptionEn: z.string().max(500).optional(),
  descriptionBn: z.string().max(500).optional(),
  icon: z.string().max(60).optional(),
  severity: z.number().int().min(1).max(3),
  isSpecial: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function upsertCategory(input: z.infer<typeof categorySchema>): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const row = {
    slug: parsed.data.slug,
    name_en: parsed.data.nameEn,
    name_bn: parsed.data.nameBn,
    description_en: parsed.data.descriptionEn || null,
    description_bn: parsed.data.descriptionBn || null,
    icon: parsed.data.icon || "more-horizontal",
    severity: parsed.data.severity,
    is_special: parsed.data.isSpecial,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  const query = parsed.data.id
    ? supabase.from("violation_categories").update(row).eq("id", parsed.data.id)
    : supabase.from("violation_categories").insert(row);

  const { error: dbError } = await query;
  if (dbError) return { ok: false, error: dbError.message || "Couldn't save the category." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: parsed.data.id ? "category.update" : "category.create",
    entityType: "violation_category",
    entityId: parsed.data.id ?? null,
    meta: { slug: parsed.data.slug },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/report");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Traffic rules
// ─────────────────────────────────────────────────────────────────────

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  ruleCode: z.string().min(2).max(60),
  titleEn: z.string().min(2).max(200),
  titleBn: z.string().min(2).max(200),
  descriptionEn: z.string().max(1000).optional(),
  descriptionBn: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  fineAmountBdt: z.number().min(0).max(1000000).optional(),
  legalReference: z.string().max(300).optional(),
  isActive: z.boolean().default(true),
});

export async function upsertTrafficRule(input: z.infer<typeof ruleSchema>): Promise<ActionResult> {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rule." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const row = {
    rule_code: parsed.data.ruleCode,
    title_en: parsed.data.titleEn,
    title_bn: parsed.data.titleBn,
    description_en: parsed.data.descriptionEn || null,
    description_bn: parsed.data.descriptionBn || null,
    category_id: parsed.data.categoryId || null,
    fine_amount_bdt: parsed.data.fineAmountBdt ?? null,
    legal_reference: parsed.data.legalReference || null,
    is_active: parsed.data.isActive,
  };

  const query = parsed.data.id
    ? supabase.from("traffic_rules").update(row).eq("id", parsed.data.id)
    : supabase.from("traffic_rules").insert(row);

  const { error: dbError } = await query;
  if (dbError) return { ok: false, error: dbError.message || "Couldn't save the rule." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: parsed.data.id ? "traffic_rule.update" : "traffic_rule.create",
    entityType: "traffic_rule",
    entityId: parsed.data.id ?? null,
    meta: { rule_code: parsed.data.ruleCode },
  });

  revalidatePath("/admin/rules");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Spam review
// ─────────────────────────────────────────────────────────────────────

const resolveSpamSchema = z.object({
  flagId: z.string().uuid(),
  resolution: z.enum(["confirmed_spam", "dismissed"]),
});

export async function resolveSpamFlag(input: z.infer<typeof resolveSpamSchema>): Promise<ActionResult> {
  const parsed = resolveSpamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { data: flag } = await supabase.from("spam_flags").select("report_id").eq("id", parsed.data.flagId).single();

  const { error: updateError } = await supabase
    .from("spam_flags")
    .update({ status: parsed.data.resolution, reviewed_by: auth.userId, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.flagId);
  if (updateError) return { ok: false, error: "Couldn't update this flag." };

  if (parsed.data.resolution === "confirmed_spam" && flag?.report_id) {
    await supabase
      .from("reports")
      .update({ status: "rejected", rejection_reason: "Confirmed spam/suspicious submission." })
      .eq("id", flag.report_id);
  }

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "spam_flag.resolve",
    entityType: "spam_flag",
    entityId: parsed.data.flagId,
    meta: { resolution: parsed.data.resolution },
  });

  revalidatePath("/admin/spam");
  revalidatePath("/admin/reports");
  return { ok: true };
}
