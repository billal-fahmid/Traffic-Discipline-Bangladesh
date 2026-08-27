"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, STAFF_ROLES, ADMIN_ROLES, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { STATUS_TRANSITIONS, type ReportStatus } from "@/lib/types";
import { notifyReportStatusChange } from "@/lib/notifications/dispatcher";

type ActionResult = { ok: true } | { ok: false; error: string };

async function guard(roles = STAFF_ROLES) {
  const supabase = await createClient();
  try {
    const auth = await requireRole(supabase, roles);
    const rl = await checkRateLimit(`user:${auth.userId}`, "officer_action");
    if (!rl.allowed) {
      return { supabase, auth: null, error: "You're performing actions too quickly. Please slow down." };
    }
    return { supabase, auth, error: null };
  } catch (e) {
    return { supabase, auth: null, error: e instanceof AuthzError ? e.message : "Something went wrong." };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Claim / assign / reassign
// ─────────────────────────────────────────────────────────────────────

const assignSchema = z.object({
  reportId: z.string().uuid(),
  officerId: z.string().uuid().nullable(), // null = unassign
});

export async function assignReport(input: z.infer<typeof assignSchema>): Promise<ActionResult> {
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const isAdmin = ADMIN_ROLES.includes(auth.role);

  // Officers may only claim a case for themselves (and only if it's unassigned) —
  // reassigning to someone else, or taking an already-assigned case, is admin-only.
  // RLS enforces the "unassigned or own" half of this too; this check produces a
  // clean error message instead of a silent RLS-denied no-op update.
  if (!isAdmin) {
    if (parsed.data.officerId !== auth.userId) {
      return { ok: false, error: "Officers can only assign cases to themselves." };
    }
    const { data: existing } = await supabase
      .from("reports")
      .select("officer_id")
      .eq("id", parsed.data.reportId)
      .single();
    if (existing?.officer_id && existing.officer_id !== auth.userId) {
      return { ok: false, error: "This case is already assigned to another officer." };
    }
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      officer_id: parsed.data.officerId,
      assigned_by: auth.userId,
      assigned_at: parsed.data.officerId ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.reportId);

  if (updateError) return { ok: false, error: "Couldn't update the assignment." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: parsed.data.officerId ? "report.assign" : "report.unassign",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { officer_id: parsed.data.officerId },
  });

  revalidatePath("/officer");
  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  revalidatePath("/admin/reports");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Status transitions
// ─────────────────────────────────────────────────────────────────────

const statusSchema = z.object({
  reportId: z.string().uuid(),
  newStatus: z.custom<ReportStatus>(),
  note: z.string().max(2000).optional(),
  force: z.boolean().optional(), // admin-only escape hatch for out-of-band corrections
});

export async function changeReportStatus(input: z.infer<typeof statusSchema>): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const isAdmin = ADMIN_ROLES.includes(auth.role);

  const { data: report } = await supabase
    .from("reports")
    .select("status, officer_id, report_code, reporter_id, mode")
    .eq("id", parsed.data.reportId)
    .single();
  if (!report) return { ok: false, error: "Report not found." };

  if (!isAdmin && report.officer_id !== auth.userId) {
    return { ok: false, error: "Only the assigned officer (or an admin) can change this report's status." };
  }

  const allowed = STATUS_TRANSITIONS[report.status as ReportStatus] ?? [];
  if (!parsed.data.force && !allowed.includes(parsed.data.newStatus)) {
    return {
      ok: false,
      error: `Can't move from "${report.status}" to "${parsed.data.newStatus}" directly.`,
    };
  }
  if (parsed.data.force && !isAdmin) {
    return { ok: false, error: "Only an admin can force a status change." };
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: parsed.data.newStatus })
    .eq("id", parsed.data.reportId);
  if (updateError) return { ok: false, error: "Couldn't update the status." };

  if (parsed.data.note) {
    await supabase.from("report_notes").insert({
      report_id: parsed.data.reportId,
      author_id: auth.userId,
      note: parsed.data.note,
    });
  }

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.status_change",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { from: report.status, to: parsed.data.newStatus, forced: !!parsed.data.force },
  });

  if (report.mode === "registered") {
    await notifyReportStatusChange(supabase, {
      reportId: parsed.data.reportId,
      reportCode: report.report_code,
      reporterId: report.reporter_id,
      newStatus: parsed.data.newStatus,
    });
  }

  revalidatePath("/officer");
  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Verify / Reject / Duplicate — thin, explicit wrappers over
// changeReportStatus so the officer UI can offer one-click actions
// with the right required fields (a reject always needs a reason).
// ─────────────────────────────────────────────────────────────────────

export async function verifyReport(reportId: string, note?: string): Promise<ActionResult> {
  return changeReportStatus({ reportId, newStatus: "verified", note });
}

const rejectSchema = z.object({ reportId: z.string().uuid(), reason: z.string().min(5).max(1000) });

export async function rejectReport(input: z.infer<typeof rejectSchema>): Promise<ActionResult> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "A rejection reason (at least 5 characters) is required." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { data: report } = await supabase
    .from("reports")
    .select("status, officer_id, report_code, reporter_id, mode")
    .eq("id", parsed.data.reportId)
    .single();
  if (!report) return { ok: false, error: "Report not found." };

  const isAdmin = ADMIN_ROLES.includes(auth.role);
  if (!isAdmin && report.officer_id !== auth.userId) {
    return { ok: false, error: "Only the assigned officer (or an admin) can reject this report." };
  }

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "rejected", rejection_reason: parsed.data.reason })
    .eq("id", parsed.data.reportId);
  if (updateError) return { ok: false, error: "Couldn't reject the report." };

  await supabase.from("report_notes").insert({
    report_id: parsed.data.reportId,
    author_id: auth.userId,
    note: `Rejected: ${parsed.data.reason}`,
  });

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.reject",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { reason: parsed.data.reason },
  });

  if (report.mode === "registered") {
    await notifyReportStatusChange(supabase, {
      reportId: parsed.data.reportId,
      reportCode: report.report_code,
      reporterId: report.reporter_id,
      newStatus: "rejected",
    });
  }

  revalidatePath("/officer");
  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  revalidatePath("/admin/reports");
  return { ok: true };
}

const duplicateSchema = z.object({
  reportId: z.string().uuid(),
  duplicateOfCode: z.string().min(5).max(30),
});

export async function markDuplicate(input: z.infer<typeof duplicateSchema>): Promise<ActionResult> {
  const parsed = duplicateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter the report code this duplicates." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { data: original } = await supabase
    .from("reports")
    .select("id")
    .eq("report_code", parsed.data.duplicateOfCode.trim().toUpperCase())
    .maybeSingle();
  if (!original) return { ok: false, error: "No report found with that code." };
  if (original.id === parsed.data.reportId) return { ok: false, error: "A report can't duplicate itself." };

  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "duplicate", is_duplicate: true, duplicate_of_report_id: original.id })
    .eq("id", parsed.data.reportId);
  if (updateError) return { ok: false, error: "Couldn't mark this report as a duplicate." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.mark_duplicate",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { duplicate_of: original.id },
  });

  revalidatePath("/officer");
  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Notes
// ─────────────────────────────────────────────────────────────────────

const noteSchema = z.object({ reportId: z.string().uuid(), note: z.string().min(1).max(2000) });

export async function addNote(input: z.infer<typeof noteSchema>): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Note can't be empty." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { error: insertError } = await supabase.from("report_notes").insert({
    report_id: parsed.data.reportId,
    author_id: auth.userId,
    note: parsed.data.note,
  });
  if (insertError) return { ok: false, error: "Couldn't save the note." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.note_added",
    entityType: "report",
    entityId: parsed.data.reportId,
  });

  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Priority
// ─────────────────────────────────────────────────────────────────────

const prioritySchema = z.object({
  reportId: z.string().uuid(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export async function setPriority(input: z.infer<typeof prioritySchema>): Promise<ActionResult> {
  const parsed = prioritySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid priority." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { error: updateError } = await supabase
    .from("reports")
    .update({ priority: parsed.data.priority })
    .eq("id", parsed.data.reportId);
  if (updateError) return { ok: false, error: "Couldn't update priority." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.priority_change",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { priority: parsed.data.priority },
  });

  revalidatePath("/officer");
  revalidatePath("/admin/reports");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Spam flagging
// ─────────────────────────────────────────────────────────────────────

const spamSchema = z.object({ reportId: z.string().uuid(), reason: z.string().min(3).max(500) });

export async function flagAsSpam(input: z.infer<typeof spamSchema>): Promise<ActionResult> {
  const parsed = spamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "A short reason is required." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { error: insertError } = await supabase.from("spam_flags").insert({
    report_id: parsed.data.reportId,
    reason: parsed.data.reason,
    flagged_by: auth.userId,
  });
  if (insertError) return { ok: false, error: "Couldn't flag this report." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.flag_spam",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { reason: parsed.data.reason },
  });

  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  revalidatePath("/admin/spam");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Evidence — short-lived signed URLs only. Files live in a private
// bucket with no public/anon read policy; this is the only path by
// which evidence content is ever reachable, and it re-checks role on
// every call rather than trusting a previously-rendered page.
// ─────────────────────────────────────────────────────────────────────

const evidenceUrlSchema = z.object({ storagePath: z.string().min(1).max(500) });

export async function getEvidenceSignedUrl(
  storagePath: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsed = evidenceUrlSchema.safeParse({ storagePath });
  if (!parsed.success) return { ok: false, error: "Invalid file reference." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  // Defense in depth against path traversal / cross-report guessing:
  // reject anything that doesn't look like "<report-id>/<file>".
  if (!/^[0-9a-f-]{36}\/[\w.-]+$/i.test(parsed.data.storagePath)) {
    return { ok: false, error: "Invalid file reference." };
  }

  const { data, error: signError } = await supabase.storage
    .from("report-evidence")
    .createSignedUrl(parsed.data.storagePath, 300); // 5 minutes

  if (signError || !data) return { ok: false, error: "Couldn't generate a viewing link for this file." };

  return { ok: true, url: data.signedUrl };
}

// ─────────────────────────────────────────────────────────────────────
// Duplicate suggestions — confirm applies the existing markDuplicate
// flow against the suggested candidate; dismiss just closes it out.
// Nothing here marks anything a duplicate without this explicit call.
// ─────────────────────────────────────────────────────────────────────

const dupActionSchema = z.object({ suggestionId: z.string().uuid() });

export async function confirmDuplicateSuggestion(suggestionId: string): Promise<ActionResult> {
  const parsed = dupActionSchema.safeParse({ suggestionId });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { data: suggestion } = await supabase
    .from("report_duplicate_suggestions")
    .select("report_id, candidate_report_id")
    .eq("id", parsed.data.suggestionId)
    .single();
  if (!suggestion) return { ok: false, error: "Suggestion not found." };

  const { data: candidate } = await supabase
    .from("reports")
    .select("report_code")
    .eq("id", suggestion.candidate_report_id)
    .single();
  if (!candidate) return { ok: false, error: "Original report not found." };

  const dupResult = await markDuplicate({
    reportId: suggestion.report_id,
    duplicateOfCode: candidate.report_code,
  });
  if (!dupResult.ok) return dupResult;

  await supabase
    .from("report_duplicate_suggestions")
    .update({ status: "confirmed", reviewed_by: auth.userId, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.suggestionId);

  revalidatePath(`/officer/reports/${suggestion.report_id}`);
  return { ok: true };
}

export async function dismissDuplicateSuggestion(suggestionId: string): Promise<ActionResult> {
  const parsed = dupActionSchema.safeParse({ suggestionId });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { data: suggestion } = await supabase
    .from("report_duplicate_suggestions")
    .select("report_id")
    .eq("id", parsed.data.suggestionId)
    .single();

  const { error: updateError } = await supabase
    .from("report_duplicate_suggestions")
    .update({ status: "dismissed", reviewed_by: auth.userId, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.suggestionId);
  if (updateError) return { ok: false, error: "Couldn't dismiss this suggestion." };

  if (suggestion) revalidatePath(`/officer/reports/${suggestion.report_id}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// AI decision support — case summarization and category suggestion.
// Both are read-only from the report's perspective: they return text
// for an officer to read, and (for category suggestion) stash an
// advisory note on the report. Neither ever changes status, category,
// or any other field an officer didn't explicitly confirm via a
// separate, ordinary action (recategorizeReport, below).
// ─────────────────────────────────────────────────────────────────────

export async function summarizeCaseWithAI(reportId: string) {
  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false as const, error: error! };

  const { data: report } = await supabase.from("reports").select("*").eq("id", reportId).single();
  if (!report) return { ok: false as const, error: "Report not found." };

  const [{ data: category }, { data: notes }] = await Promise.all([
    supabase.from("violation_categories").select("name_en").eq("id", report.category_id).single(),
    supabase.from("report_notes").select("note").eq("report_id", reportId).order("created_at", { ascending: true }),
  ]);

  const { summarizeCaseForOfficer } = await import("@/lib/ai/report-ai");
  const result = await summarizeCaseForOfficer({
    categoryName: category?.name_en ?? "Unknown",
    description: report.description,
    vehicleType: report.vehicle_type,
    vehicleRegistration: report.vehicle_registration,
    notes: (notes ?? []).map((n) => n.note),
  });

  if (!result.ok) return { ok: false as const, error: result.error };

  await supabase
    .from("reports")
    .update({ ai_summary: result.summary, ai_summary_generated_at: new Date().toISOString() })
    .eq("id", reportId);

  await logAudit(supabase, { actorId: auth.userId, action: "report.ai_summarize", entityType: "report", entityId: reportId });

  revalidatePath(`/officer/reports/${reportId}`);
  return { ok: true as const, summary: result.summary };
}

export async function suggestCategoryWithAI(reportId: string) {
  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false as const, error: error! };

  const { data: report } = await supabase.from("reports").select("description").eq("id", reportId).single();
  if (!report) return { ok: false as const, error: "Report not found." };

  const { data: categories } = await supabase.from("violation_categories").select("id, slug, name_en").eq("is_active", true);
  if (!categories) return { ok: false as const, error: "Couldn't load categories." };

  const { suggestCategoryFromText } = await import("@/lib/ai/report-ai");
  const result = await suggestCategoryFromText({
    description: report.description ?? "",
    categories: categories.map((c) => ({ slug: c.slug, name_en: c.name_en })),
  });

  if (!result.ok) return { ok: false as const, error: result.error };

  const match = categories.find((c) => c.slug === result.slug);
  if (!match) return { ok: false as const, error: "Suggestion didn't match a known category." };

  await supabase
    .from("reports")
    .update({ ai_suggested_category_id: match.id, ai_suggestion_note: result.reasoning })
    .eq("id", reportId);

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.ai_suggest_category",
    entityType: "report",
    entityId: reportId,
    meta: { slug: result.slug },
  });

  revalidatePath(`/officer/reports/${reportId}`);
  return { ok: true as const, categoryId: match.id, categoryName: match.name_en, reasoning: result.reasoning };
}

const recategorizeSchema = z.object({ reportId: z.string().uuid(), categoryId: z.string().uuid() });

/** Explicit, human-triggered recategorization — the only way a report's actual category ever changes after submission. */
export async function recategorizeReport(input: z.infer<typeof recategorizeSchema>): Promise<ActionResult> {
  const parsed = recategorizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { data: before } = await supabase.from("reports").select("category_id").eq("id", parsed.data.reportId).single();

  const { error: updateError } = await supabase
    .from("reports")
    .update({ category_id: parsed.data.categoryId })
    .eq("id", parsed.data.reportId);
  if (updateError) return { ok: false, error: "Couldn't recategorize this report." };

  await logAudit(supabase, {
    actorId: auth.userId,
    action: "report.recategorize",
    entityType: "report",
    entityId: parsed.data.reportId,
    meta: { from: before?.category_id, to: parsed.data.categoryId },
  });

  revalidatePath(`/officer/reports/${parsed.data.reportId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Case notes + history + evidence for the officer report-detail page
// ─────────────────────────────────────────────────────────────────────

export async function getCaseDetail(reportId: string) {
  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false as const, error: error! };

  const { data: report } = await supabase.from("reports").select("*").eq("id", reportId).single();
  if (!report) return { ok: false as const, error: "Report not found." };

  const [{ data: category }, { data: notes }, { data: history }, { data: evidence }] = await Promise.all([
    supabase.from("violation_categories").select("*").eq("id", report.category_id).single(),
    supabase
      .from("report_notes")
      .select("*, profiles:author_id(full_name)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false }),
    supabase
      .from("report_status_history")
      .select("*, profiles:changed_by(full_name)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false }),
    supabase.from("report_evidence").select("*").eq("report_id", reportId),
  ]);

  return { ok: true as const, report, category, notes: notes ?? [], history: history ?? [], evidence: evidence ?? [] };
}
