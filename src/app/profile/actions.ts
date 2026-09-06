"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, AuthzError } from "@/lib/authz";
import type { UserRole } from "@/lib/types";

const ANY_ROLE: UserRole[] = ["citizen", "officer", "admin", "super_admin"];

type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  const supabase = await createClient();
  try {
    const auth = await requireRole(supabase, ANY_ROLE);
    return { supabase, auth, error: null };
  } catch (e) {
    return { supabase, auth: null, error: e instanceof AuthzError ? e.message : "Something went wrong." };
  }
}

const profileSchema = z.object({
  fullName: z.string().min(2).max(150),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  district: z.string().max(100).optional().or(z.literal("")),
});

export async function updateProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check your details." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      district: parsed.data.district || null,
    })
    .eq("id", auth.userId);

  if (updateError) return { ok: false, error: "Couldn't update your profile." };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Avatar — the file itself is uploaded client-side straight to the
// "avatars" storage bucket (storage RLS restricts writes to the
// caller's own "<user-id>/" folder), so this action only ever persists
// the resulting public URL onto the profile row.
// ─────────────────────────────────────────────────────────────────────

const avatarSchema = z.object({ avatarUrl: z.string().url().max(600) });

export async function updateAvatar(input: z.infer<typeof avatarSchema>): Promise<ActionResult> {
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.avatarUrl })
    .eq("id", auth.userId);

  if (updateError) return { ok: false, error: "Couldn't save your photo." };

  revalidatePath("/profile");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Email — changing it goes through Supabase Auth's own confirmation
// flow (a link is sent to the new address before it takes effect), not
// a direct profiles-table write.
// ─────────────────────────────────────────────────────────────────────

const emailSchema = z.object({ email: z.string().email() });

export async function updateEmail(
  input: z.infer<typeof emailSchema>
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const { supabase, auth, error } = await guard();
  if (!auth) return { ok: false, error: error! };

  const { error: updateError } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true, message: "Check your new email inbox to confirm the change." };
}
