"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import {
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  isAcceptedMimeType,
  isPathForReport,
} from "@/lib/file-validation";

const submitSchema = z.object({
  mode: z.enum(["anonymous", "registered"]),
  categoryId: z.string().uuid(),
  isIllegalStoppage: z.boolean().default(false),
  routeName: z.string().max(200).optional(),
  stoppageDuration: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  locationLabel: z.string().max(300).optional(),
  district: z.string().max(100).optional(),
  thana: z.string().max(100).optional(),
  vehicleType: z.string().max(100).optional(),
  vehicleRegistration: z.string().max(50).optional(),
  vehicleColor: z.string().max(50).optional(),
  vehicleOwnerVisibleName: z.string().max(150).optional(),
  description: z.string().max(2000).optional(),
  contactName: z.string().max(150).optional(),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().email().max(150).optional().or(z.literal("")),
  // Honeypot field — real users never see or fill this input (hidden via CSS).
  // Bots that auto-fill every field will trip it.
  website: z.string().max(0).optional(),
  // Anti-bot timing check — the wizard records when the form first
  // rendered; a submission arriving implausibly fast (a script filling
  // and submitting in well under a second) is rejected. A slow human
  // filling out a multi-step form will always clear this easily.
  formOpenedAt: z.number().optional(),
});

export type SubmitReportInput = z.infer<typeof submitSchema>;

export type SubmitReportResult =
  | { ok: true; reportId: string; reportCode: string; trackingToken: string }
  | { ok: false; error: string };

export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Some fields are invalid. Please review the form and try again." };
  }
  const data = parsed.data;

  // Honeypot trip → silently pretend success is not appropriate; reject clearly server-side.
  if (data.website && data.website.length > 0) {
    return { ok: false, error: "Submission rejected." };
  }

  // Anti-bot timing check — reject implausibly fast submissions
  // (< 3 seconds from the form first rendering to submit).
  if (data.formOpenedAt && Date.now() - data.formOpenedAt < 3000) {
    return { ok: false, error: "Submission rejected. Please try again." };
  }

  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (data.mode === "registered" && !user) {
    return { ok: false, error: "You must be signed in to submit a registered report." };
  }

  // An anonymous report must not carry a session at all — use the
  // cookie-less anon client so a stale/expired auth cookie left over from
  // a previous sign-in can't make PostgREST reject the request with a JWT
  // error. Registered reports need the session so create_report's
  // auth.uid() resolves to the reporter.
  const supabase = data.mode === "registered" ? cookieClient : await createPublicClient();

  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = await hashIp(ip);
  const identity = user ? `user:${user.id}` : `ip:${ipHash}`;

  const rl = await checkRateLimit(identity, "report_submit");
  if (!rl.allowed) {
    return { ok: false, error: "You've submitted several reports recently. Please try again in a bit." };
  }

  // Insert via the create_report RPC rather than a direct table insert:
  // reports has a deliberately narrow SELECT policy (no anonymous row is
  // ever readable by an anonymous session), so `insert ... returning`
  // would be rejected for the very reporter who just created the row.
  // create_report is SECURITY DEFINER and returns only the three
  // identifiers the client needs. Contact fields are ignored by the RPC
  // for anonymous mode, and the anonymous_has_no_contact_info DB
  // constraint is the final backstop.
  const { data: rpcRows, error } = await supabase.rpc("create_report", {
    p_mode: data.mode,
    p_category_id: data.categoryId,
    p_is_illegal_stoppage: data.isIllegalStoppage,
    p_route_name: data.routeName || null,
    p_stoppage_duration: data.stoppageDuration || null,
    p_latitude: data.latitude,
    p_longitude: data.longitude,
    p_location_label: data.locationLabel || null,
    p_district: data.district || null,
    p_thana: data.thana || null,
    p_vehicle_type: data.vehicleType || null,
    p_vehicle_registration: data.vehicleRegistration || null,
    p_vehicle_color: data.vehicleColor || null,
    p_vehicle_owner_visible_name: data.vehicleOwnerVisibleName || null,
    p_description: data.description || null,
    p_contact_name: data.mode === "registered" ? data.contactName || null : null,
    p_contact_phone: data.mode === "registered" ? data.contactPhone || null : null,
    p_contact_email: data.mode === "registered" ? data.contactEmail || null : null,
    p_submitted_ip_hash: ipHash,
    p_user_agent: hdrs.get("user-agent") || null,
  });

  const inserted = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;

  if (error || !inserted) {
    console.error("submitReport insert failed", error);
    const detail =
      process.env.NODE_ENV !== "production" && error
        ? ` (${error.code ?? ""} ${error.message ?? ""})`.trimEnd()
        : "";
    return { ok: false, error: `We couldn't submit your report. Please try again.${detail}` };
  }

  return {
    ok: true,
    reportId: inserted.id,
    reportCode: inserted.report_code,
    trackingToken: inserted.tracking_token,
  };
}

export async function attachEvidence(
  reportId: string,
  files: { storagePath: string; type: "photo" | "video"; mimeType: string; fileSizeBytes: number; fileHash?: string }[]
) {
  if (files.length === 0) return { ok: true as const };

  const idSchema = z.string().uuid();
  if (!idSchema.safeParse(reportId).success) {
    return { ok: false as const, error: "Invalid report reference." };
  }

  if (files.length > MAX_EVIDENCE_FILES) {
    return { ok: false as const, error: `You can attach up to ${MAX_EVIDENCE_FILES} files.` };
  }

  const cookieClient = await createClient();

  // Rate-limit evidence attachment per submitter identity, same as the
  // report submission itself.
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  // Same reasoning as submitReport: an anonymous reporter's request must
  // not carry a (possibly stale) auth cookie. report_evidence's INSERT
  // policy allows an anonymous report's evidence regardless of session.
  const supabase = user ? cookieClient : await createPublicClient();

  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const identity = user ? `user:${user.id}` : `ip:${await hashIp(ip)}`;
  const rl = await checkRateLimit(identity, "evidence_upload");
  if (!rl.allowed) {
    return { ok: false as const, error: "Too many uploads recently. Please try again shortly." };
  }

  // Re-validate every file server-side: type, size, and that the storage
  // path actually belongs to this report (blocks a tampered client from
  // attaching a path lifted from someone else's evidence folder).
  const validRows: { report_id: string; type: "photo" | "video"; storage_path: string; mime_type: string; file_size_bytes: number; file_hash: string | null }[] = [];
  for (const f of files) {
    if (!isAcceptedMimeType(f.mimeType)) continue;
    if (f.fileSizeBytes <= 0 || f.fileSizeBytes > MAX_EVIDENCE_FILE_SIZE_BYTES) continue;
    if (!isPathForReport(f.storagePath, reportId)) continue;
    const hashOk = !f.fileHash || /^[a-f0-9]{64}$/i.test(f.fileHash);
    validRows.push({
      report_id: reportId,
      type: f.type,
      storage_path: f.storagePath,
      mime_type: f.mimeType,
      file_size_bytes: f.fileSizeBytes,
      file_hash: hashOk ? f.fileHash ?? null : null,
    });
  }

  if (validRows.length === 0) {
    return { ok: false as const, error: "No valid evidence files to attach." };
  }

  const { error } = await supabase.from("report_evidence").insert(validRows);
  if (error) {
    console.error("attachEvidence failed", error);
    return { ok: false as const, error: "Report submitted, but evidence upload failed to attach." };
  }
  if (validRows.length < files.length) {
    return { ok: true as const, warning: "Some files were skipped for failing validation." };
  }
  return { ok: true as const };
}
