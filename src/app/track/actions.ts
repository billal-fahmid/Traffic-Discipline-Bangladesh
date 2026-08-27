"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";

const lookupSchema = z.object({
  reportCode: z.string().min(5).max(30),
  trackingToken: z.string().min(5).max(60),
});

export type TrackResult =
  | {
      ok: true;
      report: {
        report_code: string;
        status: string;
        category_name_en: string;
        category_name_bn: string;
        district: string | null;
        location_label: string | null;
        created_at: string;
        updated_at: string;
      };
    }
  | { ok: false; error: string };

export async function trackReport(input: { reportCode: string; trackingToken: string }): Promise<TrackResult> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter both the report code and tracking token." };
  }

  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const identity = `ip:${await hashIp(ip)}`;

  const rl = await checkRateLimit(identity, "track_lookup");
  if (!rl.allowed) {
    return { ok: false, error: "Too many lookup attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_report_by_token", {
    p_report_code: parsed.data.reportCode.trim().toUpperCase(),
    p_tracking_token: parsed.data.trackingToken.trim(),
  });

  if (error || !data || data.length === 0) {
    return { ok: false, error: "No report found for that code and token combination." };
  }

  return { ok: true, report: data[0] };
}
