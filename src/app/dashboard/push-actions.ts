"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  authKey: z.string().min(1),
});

/** Stores a citizen's own Push subscription. RLS (push subs: own insert) enforces user_id = auth.uid() regardless of what's passed here. */
export async function savePushSubscription(input: z.infer<typeof subscribeSchema>) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid subscription." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.p256dh, auth_key: parsed.data.authKey },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false as const, error: "Couldn't save your subscription." };
  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required." };

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true as const };
}
