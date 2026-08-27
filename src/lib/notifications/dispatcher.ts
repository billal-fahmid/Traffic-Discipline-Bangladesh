import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import { sendPushToSubscription } from "./push";
import { toCitizenStage, CITIZEN_STAGE_LABEL, type ReportStatus } from "@/lib/types";

/**
 * Fans a report status change out to every channel a registered
 * citizen has available: always an in-app notification row (read by
 * the existing citizen dashboard), plus best-effort email/SMS/push if
 * we have contact info or an active subscription for them.
 *
 * Anonymous reports never reach this function with a real recipient —
 * callers should check report.mode/reporter_id before calling, and
 * this function itself is a no-op if reporterId is falsy, as one more
 * layer of protection against ever trying to "notify" someone we have
 * no legitimate contact record for.
 *
 * Every failure here is caught and logged, never thrown — a
 * notification-delivery problem should never block or roll back the
 * underlying case-management action that triggered it.
 */
export async function notifyReportStatusChange(
  supabase: SupabaseClient,
  params: { reportId: string; reportCode: string; reporterId: string | null; newStatus: ReportStatus }
) {
  if (!params.reporterId) return;

  try {
    const stage = toCitizenStage(params.newStatus);
    const title = CITIZEN_STAGE_LABEL[stage];
    const body = `Your report ${params.reportCode} is now "${title}". Open your dashboard for details.`;

    await supabase.from("notifications").insert({
      recipient_id: params.reporterId,
      report_id: params.reportId,
      channel: "in_app",
      title,
      body,
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", params.reporterId)
      .single();

    if (profile?.phone) {
      await sendSms({ to: profile.phone, body }).catch((e) => console.error("sms dispatch failed", e));
    }

    // Email address lives on auth.users, not profiles — fetch it via
    // the admin client (service role) since the citizen's own session
    // isn't the one running this dispatcher.
    try {
      const admin = await createAdminClient();
      const { data: userData } = await admin.auth.admin.getUserById(params.reporterId);
      if (userData?.user?.email) {
        await sendEmail({ to: userData.user.email, subject: `${title} — ${params.reportCode}`, body });
      }
    } catch (e) {
      console.error("email dispatch failed", e);
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", params.reporterId);

    for (const sub of subs ?? []) {
      await sendPushToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, authKey: sub.auth_key },
        { title, body, url: "/dashboard" }
      ).catch((e) => console.error("push dispatch failed", e));
    }
  } catch (err) {
    console.error("notifyReportStatusChange failed", err);
  }
}
